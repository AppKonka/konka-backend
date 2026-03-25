# backend/app/services/video_service.py
import os
import subprocess
import asyncio
import uuid
from typing import Optional, Tuple
import logging
from pathlib import Path
import shutil

from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

class VideoService:
    """Service de traitement vidéo avec FFmpeg"""
    
    def __init__(self):
        self.ffmpeg_path = settings.FFMPEG_PATH
        self.temp_dir = Path("/tmp/konka_video")
        self.temp_dir.mkdir(exist_ok=True)
    
    async def process_video(
        self,
        input_path: str,
        output_format: str = "mp4",
        resolution: Optional[Tuple[int, int]] = None,
        bitrate: Optional[str] = None,
        fps: Optional[int] = None
    ) -> str:
        """Traite une vidéo (recadrage, compression, conversion)"""
        
        output_filename = f"{uuid.uuid4()}.{output_format}"
        output_path = self.temp_dir / output_filename
        
        try:
            cmd = [self.ffmpeg_path, "-i", input_path]
            
            # Ajouter les options de résolution
            if resolution:
                cmd.extend(["-vf", f"scale={resolution[0]}:{resolution[1]}"])
            
            # Ajouter les options de bitrate
            if bitrate:
                cmd.extend(["-b:v", bitrate])
            
            # Ajouter les options de FPS
            if fps:
                cmd.extend(["-r", str(fps)])
            
            cmd.extend(["-c:v", "libx264", "-c:a", "aac", str(output_path)])
            
            # Exécuter FFmpeg
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"FFmpeg error: {stderr.decode()}")
                raise Exception(f"Video processing failed: {stderr.decode()}")
            
            # Upload vers Supabase Storage
            with open(output_path, "rb") as f:
                file_content = f.read()
                
            file_name = f"videos/{uuid.uuid4()}.{output_format}"
            
            result = db.storage("media").upload(file_name, file_content)
            
            # Obtenir l'URL publique
            public_url = db.storage("media").get_public_url(file_name)
            
            return public_url
            
        except Exception as e:
            logger.error(f"Error processing video: {e}")
            raise
            
        finally:
            # Nettoyer les fichiers temporaires
            if output_path.exists():
                output_path.unlink()
    
    async def generate_thumbnail(
        self,
        video_path: str,
        timestamp: str = "00:00:05",
        size: Tuple[int, int] = (640, 360)
    ) -> str:
        """Génère une miniature à partir d'une vidéo"""
        
        output_filename = f"{uuid.uuid4()}.jpg"
        output_path = self.temp_dir / output_filename
        
        try:
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-ss", timestamp,
                "-vf", f"scale={size[0]}:{size[1]}",
                "-vframes", "1",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
            if process.returncode != 0:
                raise Exception("Thumbnail generation failed")
            
            # Upload vers Supabase Storage
            with open(output_path, "rb") as f:
                file_content = f.read()
                
            file_name = f"thumbnails/{uuid.uuid4()}.jpg"
            
            result = db.storage("media").upload(file_name, file_content)
            
            public_url = db.storage("media").get_public_url(file_name)
            
            return public_url
            
        except Exception as e:
            logger.error(f"Error generating thumbnail: {e}")
            raise
            
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def extract_audio(self, video_path: str, format: str = "mp3") -> str:
        """Extrait l'audio d'une vidéo"""
        
        output_filename = f"{uuid.uuid4()}.{format}"
        output_path = self.temp_dir / output_filename
        
        try:
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vn",
                "-acodec", "libmp3lame" if format == "mp3" else "aac",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
            if process.returncode != 0:
                raise Exception("Audio extraction failed")
            
            # Upload vers Supabase Storage
            with open(output_path, "rb") as f:
                file_content = f.read()
                
            file_name = f"audio/{uuid.uuid4()}.{format}"
            
            result = db.storage("media").upload(file_name, file_content)
            
            public_url = db.storage("media").get_public_url(file_name)
            
            return public_url
            
        except Exception as e:
            logger.error(f"Error extracting audio: {e}")
            raise
            
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def get_video_info(self, video_path: str) -> dict:
        """Récupère les métadonnées d'une vidéo"""
        
        try:
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-f", "null",
                "-"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            # Parser la sortie pour extraire les infos
            output = stderr.decode()
            
            info = {
                "duration": None,
                "width": None,
                "height": None,
                "bitrate": None,
                "fps": None
            }
            
            # Extraire la durée
            import re
            duration_match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})", output)
            if duration_match:
                hours, minutes, seconds = duration_match.groups()
                info["duration"] = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
            
            # Extraire les dimensions
            size_match = re.search(r"(\d{3,4})x(\d{3,4})", output)
            if size_match:
                info["width"] = int(size_match.group(1))
                info["height"] = int(size_match.group(2))
            
            # Extraire le bitrate
            bitrate_match = re.search(r"bitrate: (\d+) kb/s", output)
            if bitrate_match:
                info["bitrate"] = int(bitrate_match.group(1))
            
            # Extraire le FPS
            fps_match = re.search(r"(\d+(?:\.\d+)?) fps", output)
            if fps_match:
                info["fps"] = float(fps_match.group(1))
            
            return info
            
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            return {}

# Instance singleton
video_service = VideoService()