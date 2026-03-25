# backend/app/services/audio_service.py
import os
import asyncio
import uuid
import subprocess
from typing import Optional, Tuple
import logging
from pathlib import Path
import numpy as np

from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

class AudioService:
    """Service de traitement audio avec FFmpeg"""
    
    def __init__(self):
        self.ffmpeg_path = settings.FFMPEG_PATH
        self.temp_dir = Path("/tmp/konka_audio")
        self.temp_dir.mkdir(exist_ok=True)
    
    async def process_audio(
        self,
        input_path: str,
        output_format: str = "mp3",
        bitrate: str = "192k",
        normalize: bool = False
    ) -> str:
        """Traite un fichier audio"""
        
        output_filename = f"{uuid.uuid4()}.{output_format}"
        output_path = self.temp_dir / output_filename
        
        try:
            cmd = [self.ffmpeg_path, "-i", input_path]
            
            # Normaliser le volume
            if normalize:
                cmd.extend(["-af", "loudnorm"])
            
            cmd.extend(["-b:a", bitrate, str(output_path)])
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
            if process.returncode != 0:
                raise Exception("Audio processing failed")
            
            # Upload vers Supabase Storage
            with open(output_path, "rb") as f:
                file_content = f.read()
                
            file_name = f"audio/{uuid.uuid4()}.{output_format}"
            
            result = db.storage("media").upload(file_name, file_content)
            
            public_url = db.storage("media").get_public_url(file_name)
            
            return public_url
            
        except Exception as e:
            logger.error(f"Error processing audio: {e}")
            raise
            
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def get_audio_info(self, audio_path: str) -> dict:
        """Récupère les métadonnées d'un fichier audio"""
        
        try:
            cmd = [
                self.ffmpeg_path,
                "-i", audio_path,
                "-f", "null",
                "-"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            output = stderr.decode()
            
            info = {
                "duration": None,
                "bitrate": None,
                "sample_rate": None,
                "channels": None
            }
            
            import re
            
            # Extraire la durée
            duration_match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})", output)
            if duration_match:
                hours, minutes, seconds = duration_match.groups()
                info["duration"] = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
            
            # Extraire le bitrate
            bitrate_match = re.search(r"bitrate: (\d+) kb/s", output)
            if bitrate_match:
                info["bitrate"] = int(bitrate_match.group(1))
            
            # Extraire le sample rate
            sample_rate_match = re.search(r"(\d+) Hz", output)
            if sample_rate_match:
                info["sample_rate"] = int(sample_rate_match.group(1))
            
            # Extraire le nombre de canaux
            channels_match = re.search(r"(\d+) channels?", output)
            if channels_match:
                info["channels"] = int(channels_match.group(1))
            
            return info
            
        except Exception as e:
            logger.error(f"Error getting audio info: {e}")
            return {}
    
    async def extract_waveform(self, audio_path: str, width: int = 1000, height: int = 200) -> str:
        """Génère une image de waveform à partir d'un fichier audio"""
        
        output_filename = f"{uuid.uuid4()}.png"
        output_path = self.temp_dir / output_filename
        
        try:
            cmd = [
                self.ffmpeg_path,
                "-i", audio_path,
                "-filter_complex", f"showwavespic=s={width}x{height}",
                "-frames:v", "1",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
            if process.returncode != 0:
                raise Exception("Waveform generation failed")
            
            # Upload vers Supabase Storage
            with open(output_path, "rb") as f:
                file_content = f.read()
                
            file_name = f"waveforms/{uuid.uuid4()}.png"
            
            result = db.storage("media").upload(file_name, file_content)
            
            public_url = db.storage("media").get_public_url(file_name)
            
            return public_url
            
        except Exception as e:
            logger.error(f"Error generating waveform: {e}")
            return ""
            
        finally:
            if output_path.exists():
                output_path.unlink()

# Instance singleton
audio_service = AudioService()