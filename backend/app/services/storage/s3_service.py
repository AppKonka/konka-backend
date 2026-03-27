# backend/app/services/storage/s3_service.py
import boto3
import logging
from typing import Optional, BinaryIO
from botocore.exceptions import ClientError
from app.config import settings

logger = logging.getLogger(__name__)

class S3Service:
    """Service de stockage S3 pour les médias"""
    
    def __init__(self):
        self.client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION
        )
        self.bucket = settings.AWS_S3_BUCKET
    
    async def upload_file(
        self,
        bucket: str,
        key: str,
        file_path: str,
        content_type: str = "application/octet-stream",
        cache_control: str = "public, max-age=31536000"
    ) -> str:
        """Upload un fichier vers S3"""
        try:
            self.client.upload_file(
                file_path,
                bucket,
                key,
                ExtraArgs={
                    'ContentType': content_type,
                    'CacheControl': cache_control
                }
            )
            
            # Générer l'URL publique
            url = f"https://{bucket}.s3.amazonaws.com/{key}"
            
            logger.info(f"File uploaded to S3: {key}")
            return url
            
        except ClientError as e:
            logger.error(f"Error uploading to S3: {e}")
            raise
    
    async def upload_fileobj(
        self,
        bucket: str,
        key: str,
        file_obj: BinaryIO,
        content_type: str = "application/octet-stream",
        cache_control: str = "public, max-age=31536000"
    ) -> str:
        """Upload un objet fichier vers S3"""
        try:
            self.client.upload_fileobj(
                file_obj,
                bucket,
                key,
                ExtraArgs={
                    'ContentType': content_type,
                    'CacheControl': cache_control
                }
            )
            
            url = f"https://{bucket}.s3.amazonaws.com/{key}"
            
            logger.info(f"File object uploaded to S3: {key}")
            return url
            
        except ClientError as e:
            logger.error(f"Error uploading fileobj to S3: {e}")
            raise
    
    async def download_file(self, bucket: str, key: str, file_path: str) -> bool:
        """Télécharge un fichier depuis S3"""
        try:
            self.client.download_file(bucket, key, file_path)
            logger.info(f"File downloaded from S3: {key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error downloading from S3: {e}")
            return False
    
    async def delete_file(self, bucket: str, key: str) -> bool:
        """Supprime un fichier de S3"""
        try:
            self.client.delete_object(Bucket=bucket, Key=key)
            logger.info(f"File deleted from S3: {key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error deleting from S3: {e}")
            return False
    
    async def file_exists(self, bucket: str, key: str) -> bool:
        """Vérifie si un fichier existe dans S3"""
        try:
            self.client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError:
            return False
    
    async def get_file_url(self, bucket: str, key: str) -> str:
        """Génère l'URL publique d'un fichier"""
        return f"https://{bucket}.s3.amazonaws.com/{key}"

# Instance singleton
s3_service = S3Service()