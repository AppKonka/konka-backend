# backend/app/services/audio/audio_effects_service.py
import subprocess
import asyncio
import logging
from typing import Dict, List, Optional
from pathlib import Path
import tempfile
from app.config import settings

logger = logging.getLogger(__name__)

class AudioEffectsService:
    """Service d'effets audio (filtres, réverbération, etc.)"""
    
    def __init__(self):
        self.ffmpeg_path = settings.FFMPEG_PATH
        
        # Utiliser le dossier temp du système (compatible Windows/Linux/macOS)
        temp_base = Path(tempfile.gettempdir()) / "konka_audio_effects"
        self.temp_dir = temp_base
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Effets prédéfinis
        self.effects = {
            "reverb": {
                "description": "Réverbération",
                "filter": "aecho=0.8:0.88:60:0.4"
            },
            "echo": {
                "description": "Écho",
                "filter": "aecho=0.8:0.9:1000:0.3"
            },
            "chorus": {
                "description": "Chorus",
                "filter": "chorus=0.5:0.9:50:0.4:0.25:2"
            },
            "flanger": {
                "description": "Flanger",
                "filter": "flanger"
            },
            "phaser": {
                "description": "Phaser",
                "filter": "aphaser"
            },
            "pitch_up": {
                "description": "Aigu",
                "filter": "asetrate=48000*1.25,atempo=0.8"
            },
            "pitch_down": {
                "description": "Grave",
                "filter": "asetrate=48000*0.8,atempo=1.25"
            },
            "robot": {
                "description": "Robot",
                "filter": "aecho=0.8:0.88:60:0.4,chorus=0.5:0.9:50:0.4:0.25:2"
            },
            "bass_boost": {
                "description": "Boost basses",
                "filter": "aequalizer=100:2:10"
            },
            "treble_boost": {
                "description": "Boost aigus",
                "filter": "aequalizer=10000:2:10"
            }
        }
    
    async def apply_effect(
        self,
        audio_path: str,
        effect_name: str,
        intensity: float = 0.5,
        output_format: str = "mp3"
    ) -> str:
        """Applique un effet audio"""
        try:
            effect_config = self.effects.get(effect_name)
            if not effect_config:
                raise Exception(f"Effect {effect_name} not found")
            
            output_filename = f"{Path(audio_path).stem}_effect_{effect_name}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", audio_path,
                "-af", effect_config["filter"],
                "-c:a", "libmp3lame" if output_format == "mp3" else "aac",
                "-b:a", "192k",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception(f"Effect application failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error applying effect: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def mix_tracks(
        self,
        track_paths: List[str],
        volumes: Optional[List[float]] = None,
        output_format: str = "mp3"
    ) -> str:
        """Mélange plusieurs pistes audio"""
        try:
            output_filename = f"mix_{hash(str(track_paths))}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            if not volumes:
                volumes = [1.0] * len(track_paths)
            
            # Construire la commande
            cmd = [self.ffmpeg_path]
            
            # Ajouter toutes les pistes
            for path in track_paths:
                cmd.extend(["-i", path])
            
            # Construire le filtre de mixage
            filter_parts = []
            for i, vol in enumerate(volumes):
                filter_parts.append(f"[{i}:a]volume={vol}[a{i}]")
            
            amix_filter = f"{''.join(filter_parts)};{''.join([f'[a{i}]' for i in range(len(track_paths))])}amix=inputs={len(track_paths)}:duration=longest[a]"
            
            cmd.extend([
                "-filter_complex", amix_filter,
                "-map", "[a]",
                "-c:a", "libmp3lame" if output_format == "mp3" else "aac",
                "-b:a", "192k",
                str(output_path)
            ])
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Mix failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error mixing tracks: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def normalize_volume(self, audio_path: str, target_level: float = -23) -> str:
        """Normalise le volume d'un fichier audio (EBU R128)"""
        try:
            output_filename = f"{Path(audio_path).stem}_normalized.{Path(audio_path).suffix}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", audio_path,
                "-af", f"loudnorm=I={target_level}:TP=-1.5:LRA=11",
                "-c:a", "libmp3lame",
                "-b:a", "192k",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Normalization failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error normalizing volume: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def remove_vocals(self, audio_path: str, output_format: str = "mp3") -> str:
        """Supprime les voix (karaoké)"""
        try:
            output_filename = f"{Path(audio_path).stem}_instrumental.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", audio_path,
                "-af", "pan=stereo|c0=c0-c1|c1=c1-c0",
                "-c:a", "libmp3lame" if output_format == "mp3" else "aac",
                "-b:a", "192k",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Vocal removal failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error removing vocals: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def extract_vocals(self, audio_path: str) -> str:
        """Extrait les voix (a cappella)"""
        try:
            output_filename = f"{Path(audio_path).stem}_vocals.mp3"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", audio_path,
                "-af", "pan=stereo|c0=c0-c1|c1=c1-c0",
                "-c:a", "libmp3lame",
                "-b:a", "192k",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Vocal extraction failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error extracting vocals: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()

# Instance singleton
audio_effects_service = AudioEffectsService()