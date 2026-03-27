# backend/app/services/backup/backup_service.py
import os
import subprocess
import asyncio
import logging
import gzip
import shutil
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

# Vérification des dépendances optionnelles
BOTO3_AVAILABLE = False
APSCHEUDLER_AVAILABLE = False

try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
    logger.info("boto3 loaded successfully")
except ImportError:
    logger.warning("boto3 not installed - S3 backup disabled")

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    APSCHEUDLER_AVAILABLE = True
    logger.info("apscheduler loaded successfully")
except ImportError:
    logger.warning("apscheduler not installed - scheduled backups disabled")

# Définir ClientError si boto3 n'est pas disponible
if not BOTO3_AVAILABLE:
    class ClientError(Exception):
        pass


class BackupService:
    """Service complet de sauvegarde automatique"""
    
    def __init__(self):
        self.backup_dir = Path("/backups")
        self.backup_dir.mkdir(exist_ok=True)
        
        # Configuration S3 (optionnel)
        self.s3_client = None
        self.backup_bucket = None
        
        if BOTO3_AVAILABLE and settings.AWS_ACCESS_KEY_ID:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION
                )
                self.backup_bucket = f"{settings.AWS_S3_BUCKET}-backups"
                logger.info("S3 backup client initialized")
            except Exception as e:
                logger.warning(f"S3 client initialization failed: {e}")
        else:
            if not BOTO3_AVAILABLE:
                logger.warning("S3 backup disabled - boto3 not installed")
            elif not settings.AWS_ACCESS_KEY_ID:
                logger.warning("S3 backup disabled - AWS credentials missing")
        
        # Rétention des sauvegardes (en jours)
        self.retention = {
            "daily": 7,
            "weekly": 4,
            "monthly": 12
        }
    
    # ==================== SAUVEGARDE BASE DE DONNÉES ====================
    
    async def backup_database(self) -> Dict[str, Any]:
        """Sauvegarde la base de données PostgreSQL"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"konka_db_{timestamp}.sql.gz"
            backup_path = self.backup_dir / backup_filename
            
            # Utiliser la méthode de backup locale
            backup_content = await self._local_db_backup()
            if backup_content:
                with open(backup_path, 'wb') as f:
                    f.write(backup_content)
            else:
                return {"success": False, "error": "No database backup method available"}
            
            # Upload vers S3 si disponible
            s3_key = None
            if self.s3_client and self.backup_bucket:
                s3_key = f"databases/{backup_filename}"
                await self._upload_to_s3(backup_path, s3_key)
            
            # Sauvegarder les métadonnées
            backup_info = {
                "type": "database",
                "filename": backup_filename,
                "size": backup_path.stat().st_size,
                "created_at": datetime.now().isoformat(),
                "s3_key": s3_key,
                "local_path": str(backup_path) if not s3_key else None
            }
            
            await db.table('backups').insert(backup_info).execute()
            
            # Nettoyer les anciennes sauvegardes
            await self._cleanup_old_backups()
            
            logger.info(f"Database backup created: {backup_filename} ({backup_info['size']} bytes)")
            
            return {
                "success": True,
                "filename": backup_filename,
                "size": backup_info["size"],
                "s3_key": s3_key,
                "local_path": backup_info.get("local_path")
            }
            
        except Exception as e:
            logger.error(f"Error backing up database: {e}")
            return {"success": False, "error": str(e)}
    
    async def _local_db_backup(self) -> Optional[bytes]:
        """Méthode de backup locale (export JSON des tables)"""
        try:
            # Liste des tables à sauvegarder
            tables = [
                'users', 'artists', 'sellers', 'tracks', 'albums', 'playlists',
                'videos', 'posts', 'sparks', 'matches', 'messages', 'products',
                'orders', 'order_items', 'chill_events', 'chill_participants',
                'dedications', 'notifications', 'follows', 'user_interests',
                'likes', 'comments', 'reports'
            ]
            backup_data = {
                "version": "1.0",
                "created_at": datetime.now().isoformat(),
                "tables": {}
            }
            
            for table in tables:
                try:
                    result = await db.table(table).select('*').execute()
                    backup_data["tables"][table] = result.data
                    logger.debug(f"Backed up table {table}: {len(result.data)} records")
                except Exception as e:
                    logger.error(f"Error backing up table {table}: {e}")
                    backup_data["tables"][table] = []
                    backup_data["errors"] = backup_data.get("errors", [])
                    backup_data["errors"].append({"table": table, "error": str(e)})
            
            return json.dumps(backup_data, default=str, indent=2).encode('utf-8')
            
        except Exception as e:
            logger.error(f"Error in local backup: {e}")
            return None
    
    # ==================== SAUVEGARDE MÉDIAS ====================
    
    async def backup_media(self, bucket: str = "media") -> Dict[str, Any]:
        """Sauvegarde les médias depuis S3 (si disponible)"""
        try:
            if not self.s3_client:
                return {"success": False, "error": "S3 backup not available - boto3 not installed"}
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"konka_media_{timestamp}.tar.gz"
            backup_path = self.backup_dir / backup_filename
            
            # Lister tous les objets dans le bucket
            objects = []
            continuation_token = None
            
            try:
                while True:
                    if continuation_token:
                        response = self.s3_client.list_objects_v2(
                            Bucket=bucket,
                            ContinuationToken=continuation_token
                        )
                    else:
                        response = self.s3_client.list_objects_v2(Bucket=bucket)
                    
                    if 'Contents' in response:
                        objects.extend(response['Contents'])
                    
                    if response.get('IsTruncated'):
                        continuation_token = response.get('NextContinuationToken')
                    else:
                        break
            except ClientError as e:
                logger.error(f"S3 list error: {e}")
                return {"success": False, "error": f"S3 error: {e}"}
            
            if not objects:
                return {"success": True, "message": "No objects to backup", "objects_count": 0}
            
            # Télécharger et compresser
            import tarfile
            with tarfile.open(backup_path, "w:gz") as tar:
                objects_count = 0
                for obj in objects[:100]:  # Limiter pour performance
                    key = obj['Key']
                    temp_path = self.backup_dir / f"temp_{key.replace('/', '_')}"
                    
                    try:
                        self.s3_client.download_file(bucket, key, str(temp_path))
                        tar.add(temp_path, arcname=key)
                        temp_path.unlink()
                        objects_count += 1
                    except Exception as e:
                        logger.error(f"Error downloading {key}: {e}")
            
            # Upload vers le bucket de backup
            s3_key = f"media/{backup_filename}"
            await self._upload_to_s3(backup_path, s3_key)
            
            # Sauvegarder les métadonnées
            backup_info = {
                "type": "media",
                "filename": backup_filename,
                "size": backup_path.stat().st_size,
                "objects_count": objects_count,
                "created_at": datetime.now().isoformat(),
                "s3_key": s3_key
            }
            
            await db.table('backups').insert(backup_info).execute()
            
            logger.info(f"Media backup created: {backup_filename} ({objects_count} files, {backup_info['size']} bytes)")
            
            return {
                "success": True,
                "filename": backup_filename,
                "size": backup_info["size"],
                "objects_count": objects_count,
                "s3_key": s3_key
            }
            
        except Exception as e:
            logger.error(f"Error backing up media: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== SAUVEGARDE COMPLÈTE ====================
    
    async def backup_full(self) -> Dict[str, Any]:
        """Sauvegarde complète (base de données + médias)"""
        try:
            db_backup = await self.backup_database()
            media_backup = await self.backup_media() if self.s3_client else {"success": True, "message": "Skipped - S3 not available"}
            
            return {
                "success": db_backup["success"],
                "database": db_backup,
                "media": media_backup,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error creating full backup: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== RESTAURATION ====================
    
    async def restore_database(self, backup_filename: str) -> Dict[str, Any]:
        """Restaure une sauvegarde de base de données"""
        try:
            backup_path = self.backup_dir / backup_filename
            
            # Vérifier si le fichier existe localement
            if not backup_path.exists() and self.s3_client:
                # Télécharger depuis S3
                s3_key = f"databases/{backup_filename}"
                await self._download_from_s3(s3_key, backup_path)
            
            if not backup_path.exists():
                return {"success": False, "error": "Backup file not found"}
            
            # Décompresser
            if backup_path.suffix == '.gz':
                with gzip.open(backup_path, 'rb') as f_in:
                    content = f_in.read()
                json_path = backup_path.with_suffix('')
                with open(json_path, 'wb') as f_out:
                    f_out.write(content)
            else:
                json_path = backup_path
            
            # Restaurer depuis JSON
            import json
            with open(json_path, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            tables = backup_data.get("tables", {})
            restored_count = 0
            
            for table_name, table_data in tables.items():
                if table_data:
                    try:
                        # Supprimer les données existantes
                        await db.table(table_name).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                        # Insérer les nouvelles données
                        await db.table(table_name).insert(table_data).execute()
                        restored_count += len(table_data)
                        logger.info(f"Restored table {table_name}: {len(table_data)} records")
                    except Exception as e:
                        logger.error(f"Error restoring table {table_name}: {e}")
            
            # Nettoyer
            if json_path != backup_path:
                json_path.unlink()
            
            logger.info(f"Database restored from: {backup_filename} ({restored_count} records restored)")
            
            return {
                "success": True,
                "filename": backup_filename,
                "records_restored": restored_count
            }
            
        except Exception as e:
            logger.error(f"Error restoring database: {e}")
            return {"success": False, "error": str(e)}
    
    async def restore_media(self, backup_filename: str) -> Dict[str, Any]:
        """Restaure une sauvegarde de médias"""
        try:
            if not self.s3_client:
                return {"success": False, "error": "S3 restore not available - boto3 not installed"}
            
            backup_path = self.backup_dir / backup_filename
            
            # Télécharger depuis S3
            s3_key = f"media/{backup_filename}"
            await self._download_from_s3(s3_key, backup_path)
            
            # Extraire
            import tarfile
            temp_dir = self.backup_dir / "restore_temp"
            temp_dir.mkdir(exist_ok=True)
            
            restored_count = 0
            with tarfile.open(backup_path, "r:gz") as tar:
                tar.extractall(temp_dir)
            
            # Upload vers S3
            for file_path in temp_dir.rglob("*"):
                if file_path.is_file():
                    relative_path = file_path.relative_to(temp_dir)
                    try:
                        await self._upload_to_s3(file_path, str(relative_path))
                        restored_count += 1
                    except Exception as e:
                        logger.error(f"Error uploading {relative_path}: {e}")
            
            # Nettoyer
            shutil.rmtree(temp_dir)
            backup_path.unlink()
            
            logger.info(f"Media restored from: {backup_filename} ({restored_count} files restored)")
            
            return {
                "success": True,
                "filename": backup_filename,
                "files_restored": restored_count
            }
            
        except Exception as e:
            logger.error(f"Error restoring media: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== NETTOYAGE ====================
    
    async def _cleanup_old_backups(self):
        """Supprime les anciennes sauvegardes selon la politique de rétention"""
        try:
            # Récupérer toutes les sauvegardes
            backups = await db.table('backups').select('*').order('created_at', desc=True).execute()
            
            for backup in backups.data:
                created_at = datetime.fromisoformat(backup['created_at'])
                age_days = (datetime.now() - created_at).days
                backup_type = backup.get('type', 'database')
                
                should_delete = False
                
                if backup_type == "database":
                    if age_days > self.retention["daily"]:
                        should_delete = True
                
                elif backup_type == "media":
                    if age_days > self.retention["weekly"]:
                        should_delete = True
                
                if should_delete:
                    # Supprimer de S3 si disponible
                    if self.s3_client and backup.get('s3_key'):
                        try:
                            self.s3_client.delete_object(
                                Bucket=self.backup_bucket,
                                Key=backup['s3_key']
                            )
                            logger.debug(f"Deleted from S3: {backup['s3_key']}")
                        except Exception as e:
                            logger.warning(f"Error deleting from S3: {e}")
                    
                    # Supprimer le fichier local
                    if backup.get('local_path'):
                        try:
                            Path(backup['local_path']).unlink(missing_ok=True)
                            logger.debug(f"Deleted local file: {backup['local_path']}")
                        except Exception as e:
                            logger.warning(f"Error deleting local file: {e}")
                    
                    # Supprimer de la base de données
                    await db.table('backups').delete().eq('id', backup['id']).execute()
                    
                    logger.info(f"Deleted old backup: {backup['filename']} (age: {age_days} days)")
            
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {e}")
    
    # ==================== UTILITAIRES S3 ====================
    
    async def _upload_to_s3(self, file_path: Path, key: str):
        """Upload un fichier vers S3"""
        if not self.s3_client:
            raise Exception("S3 client not available")
        
        try:
            extra_args = {}
            if str(file_path).endswith('.gz'):
                extra_args['ContentEncoding'] = 'gzip'
            extra_args['ServerSideEncryption'] = 'AES256'
            
            self.s3_client.upload_file(
                str(file_path),
                self.backup_bucket,
                key,
                ExtraArgs=extra_args
            )
            logger.debug(f"Uploaded to S3: {key}")
        except Exception as e:
            logger.error(f"Error uploading to S3: {e}")
            raise
    
    async def _download_from_s3(self, key: str, file_path: Path):
        """Télécharge un fichier depuis S3"""
        if not self.s3_client:
            raise Exception("S3 client not available")
        
        try:
            self.s3_client.download_file(
                self.backup_bucket,
                key,
                str(file_path)
            )
            logger.debug(f"Downloaded from S3: {key}")
        except Exception as e:
            logger.error(f"Error downloading from S3: {e}")
            raise
    
    # ==================== SCHÉDULER ====================
    
    async def schedule_backup(self, schedule: str = "daily") -> Dict[str, Any]:
        """Planifie des sauvegardes automatiques"""
        try:
            if not APSCHEUDLER_AVAILABLE:
                return {"success": False, "error": "apscheduler not installed. Run: pip install apscheduler"}
            
            scheduler = AsyncIOScheduler()
            
            if schedule == "daily":
                scheduler.add_job(
                    self.backup_full,
                    'cron',
                    hour=2,
                    minute=0,
                    id='daily_backup'
                )
                logger.info("Daily backup scheduled at 02:00")
            elif schedule == "weekly":
                scheduler.add_job(
                    self.backup_full,
                    'cron',
                    day_of_week='sun',
                    hour=2,
                    minute=0,
                    id='weekly_backup'
                )
                logger.info("Weekly backup scheduled on Sunday at 02:00")
            elif schedule == "hourly":
                scheduler.add_job(
                    self.backup_database,
                    'interval',
                    hours=1,
                    id='hourly_backup'
                )
                logger.info("Hourly backup scheduled")
            else:
                return {"success": False, "error": f"Invalid schedule: {schedule}"}
            
            scheduler.start()
            
            return {
                "success": True,
                "schedule": schedule,
                "message": f"Backup scheduled {schedule}"
            }
            
        except Exception as e:
            logger.error(f"Error scheduling backup: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== STATISTIQUES ====================
    
    async def get_backup_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques des sauvegardes"""
        try:
            backups = await db.table('backups').select('*').execute()
            
            total_size = sum(b.get('size', 0) for b in backups.data)
            total_count = len(backups.data)
            
            latest_backup = backups.data[0] if backups.data else None
            
            return {
                "total_backups": total_count,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2) if total_size else 0,
                "latest_backup": latest_backup,
                "backups_by_type": {
                    "database": len([b for b in backups.data if b.get('type') == 'database']),
                    "media": len([b for b in backups.data if b.get('type') == 'media'])
                },
                "s3_enabled": self.s3_client is not None,
                "scheduler_enabled": APSCHEUDLER_AVAILABLE,
                "backup_dir": str(self.backup_dir)
            }
            
        except Exception as e:
            logger.error(f"Error getting backup stats: {e}")
            return {}

# Instance singleton
backup_service = BackupService()