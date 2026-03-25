# backend/app/services/backup/backup_service.py
import os
import subprocess
import asyncio
import logging
import gzip
import shutil
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

class BackupService:
    """Service complet de sauvegarde automatique"""
    
    def __init__(self):
        self.backup_dir = Path("/backups")
        self.backup_dir.mkdir(exist_ok=True)
        
        # Configuration S3
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION
        )
        self.backup_bucket = f"{settings.AWS_S3_BUCKET}-backups"
        
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
            
            # Commande pg_dump
            cmd = [
                "pg_dump",
                f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}",
                "-F", "c",
                "-f", str(backup_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"pg_dump error: {stderr.decode()}")
            
            # Compresser
            compressed_path = backup_path.with_suffix(".sql.gz")
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    f_out.write(f_in.read())
            
            backup_path.unlink()
            
            # Upload vers S3
            s3_key = f"databases/{backup_filename}"
            await self._upload_to_s3(compressed_path, s3_key)
            
            # Sauvegarder les métadonnées
            backup_info = {
                "type": "database",
                "filename": backup_filename,
                "size": compressed_path.stat().st_size,
                "created_at": datetime.now().isoformat(),
                "s3_key": s3_key
            }
            
            await db.table('backups').insert(backup_info).execute()
            
            # Nettoyer les anciennes sauvegardes
            await self._cleanup_old_backups()
            
            logger.info(f"Database backup created: {backup_filename}")
            
            return {
                "success": True,
                "filename": backup_filename,
                "size": backup_info["size"],
                "s3_key": s3_key
            }
            
        except Exception as e:
            logger.error(f"Error backing up database: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== SAUVEGARDE MÉDIAS ====================
    
    async def backup_media(self, bucket: str = "media") -> Dict[str, Any]:
        """Sauvegarde les médias depuis S3"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"konka_media_{timestamp}.tar.gz"
            backup_path = self.backup_dir / backup_filename
            
            # Lister tous les objets dans le bucket
            objects = []
            continuation_token = None
            
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
            
            # Télécharger et compresser
            import tarfile
            with tarfile.open(backup_path, "w:gz") as tar:
                for obj in objects:
                    key = obj['Key']
                    temp_path = self.backup_dir / f"temp_{key.replace('/', '_')}"
                    
                    self.s3_client.download_file(bucket, key, str(temp_path))
                    tar.add(temp_path, arcname=key)
                    temp_path.unlink()
            
            # Upload vers le bucket de backup
            s3_key = f"media/{backup_filename}"
            await self._upload_to_s3(backup_path, s3_key)
            
            # Sauvegarder les métadonnées
            backup_info = {
                "type": "media",
                "filename": backup_filename,
                "size": backup_path.stat().st_size,
                "objects_count": len(objects),
                "created_at": datetime.now().isoformat(),
                "s3_key": s3_key
            }
            
            await db.table('backups').insert(backup_info).execute()
            
            logger.info(f"Media backup created: {backup_filename} ({len(objects)} files)")
            
            return {
                "success": True,
                "filename": backup_filename,
                "size": backup_info["size"],
                "objects_count": len(objects),
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
            media_backup = await self.backup_media()
            
            return {
                "success": db_backup["success"] and media_backup["success"],
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
            # Télécharger depuis S3
            backup_path = self.backup_dir / backup_filename
            s3_key = f"databases/{backup_filename}"
            
            await self._download_from_s3(s3_key, backup_path)
            
            # Décompresser
            with gzip.open(backup_path, 'rb') as f_in:
                sql_content = f_in.read()
            
            sql_path = backup_path.with_suffix('.sql')
            with open(sql_path, 'wb') as f_out:
                f_out.write(sql_content)
            
            # Restaurer avec pg_restore
            cmd = [
                "pg_restore",
                "--clean",
                "--if-exists",
                "--no-owner",
                f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}",
                str(sql_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"pg_restore error: {stderr.decode()}")
            
            # Nettoyer
            backup_path.unlink()
            sql_path.unlink()
            
            logger.info(f"Database restored from: {backup_filename}")
            
            return {"success": True, "filename": backup_filename}
            
        except Exception as e:
            logger.error(f"Error restoring database: {e}")
            return {"success": False, "error": str(e)}
    
    async def restore_media(self, backup_filename: str) -> Dict[str, Any]:
        """Restaure une sauvegarde de médias"""
        try:
            # Télécharger depuis S3
            backup_path = self.backup_dir / backup_filename
            s3_key = f"media/{backup_filename}"
            
            await self._download_from_s3(s3_key, backup_path)
            
            # Extraire
            import tarfile
            temp_dir = self.backup_dir / "restore_temp"
            temp_dir.mkdir(exist_ok=True)
            
            with tarfile.open(backup_path, "r:gz") as tar:
                tar.extractall(temp_dir)
            
            # Upload vers S3
            for file_path in temp_dir.rglob("*"):
                if file_path.is_file():
                    relative_path = file_path.relative_to(temp_dir)
                    await self._upload_to_s3(file_path, str(relative_path))
            
            # Nettoyer
            shutil.rmtree(temp_dir)
            backup_path.unlink()
            
            logger.info(f"Media restored from: {backup_filename}")
            
            return {"success": True, "filename": backup_filename}
            
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
                backup_type = backup['type']
                
                should_delete = False
                
                if backup_type == "database":
                    if age_days > self.retention["daily"]:
                        should_delete = True
                
                elif backup_type == "media":
                    if age_days > self.retention["weekly"]:
                        should_delete = True
                
                if should_delete:
                    # Supprimer de S3
                    try:
                        self.s3_client.delete_object(
                            Bucket=self.backup_bucket,
                            Key=backup['s3_key']
                        )
                    except ClientError:
                        pass
                    
                    # Supprimer de la base de données
                    await db.table('backups').delete().eq('id', backup['id']).execute()
                    
                    logger.info(f"Deleted old backup: {backup['filename']}")
            
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {e}")
    
    # ==================== UTILITAIRES S3 ====================
    
    async def _upload_to_s3(self, file_path: Path, key: str):
        """Upload un fichier vers S3"""
        try:
            self.s3_client.upload_file(
                str(file_path),
                self.backup_bucket,
                key
            )
        except ClientError as e:
            logger.error(f"Error uploading to S3: {e}")
            raise
    
    async def _download_from_s3(self, key: str, file_path: Path):
        """Télécharge un fichier depuis S3"""
        try:
            self.s3_client.download_file(
                self.backup_bucket,
                key,
                str(file_path)
            )
        except ClientError as e:
            logger.error(f"Error downloading from S3: {e}")
            raise
    
    # ==================== SCHÉDULER ====================
    
    async def schedule_backup(self, schedule: str = "daily") -> Dict[str, Any]:
        """Planifie des sauvegardes automatiques"""
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            
            scheduler = AsyncIOScheduler()
            
            if schedule == "daily":
                scheduler.add_job(
                    self.backup_full,
                    'cron',
                    hour=2,
                    minute=0,
                    id='daily_backup'
                )
            elif schedule == "weekly":
                scheduler.add_job(
                    self.backup_full,
                    'cron',
                    day_of_week='sun',
                    hour=2,
                    minute=0,
                    id='weekly_backup'
                )
            elif schedule == "hourly":
                scheduler.add_job(
                    self.backup_database,
                    'interval',
                    hours=1,
                    id='hourly_backup'
                )
            
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
            
            total_size = sum(b['size'] for b in backups.data)
            total_count = len(backups.data)
            
            latest_backup = backups.data[0] if backups.data else None
            
            return {
                "total_backups": total_count,
                "total_size_bytes": total_size,
                "total_size_mb": total_size / (1024 * 1024),
                "latest_backup": latest_backup,
                "backups_by_type": {
                    "database": len([b for b in backups.data if b['type'] == 'database']),
                    "media": len([b for b in backups.data if b['type'] == 'media'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting backup stats: {e}")
            return {}

# Instance singleton
backup_service = BackupService()