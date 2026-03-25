# backend/app/services/video/video_effects_service.py
import subprocess
import asyncio
import json
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)

class VideoEffectsService:
    """Service d'effets vidéo (filtres AR, animations)"""
    
    def __init__(self):
        self.ffmpeg_path = settings.FFMPEG_PATH
        self.temp_dir = Path("/tmp/konka_effects")
        self.temp_dir.mkdir(exist_ok=True)
        
        # Filtres prédéfinis
        self.filters = {
            "vintage": {
                "description": "Style vintage avec effet sépia",
                "filter": "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"
            },
            "black_white": {
                "description": "Noir et blanc",
                "filter": "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3"
            },
            "sepia": {
                "description": "Effet sépia chaud",
                "filter": "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"
            },
            "blur": {
                "description": "Flou artistique",
                "filter": "boxblur=5:1"
            },
            "sharpen": {
                "description": "Nettoie l'image",
                "filter": "unsharp=5:5:1.0:5:5:0.0"
            },
            "cartoon": {
                "description": "Effet cartoon",
                "filter": "minterpolate='fps=15',edgedetect"
            },
            "vignette": {
                "description": "Vignettage",
                "filter": "vignette=PI/4"
            },
            "glitch": {
                "description": "Effet glitch numérique",
                "filter": "noise=alls=20:allf=t"
            },
            "pixelate": {
                "description": "Pixelisation",
                "filter": "scale=iw/10:ih/10,scale=iw*10:ih*10:flags=neighbor"
            },
            "mirror": {
                "description": "Effet miroir",
                "filter": "split [main][mirror]; [mirror] hflip [mirror]; [main][mirror] overlay=W/2:0"
            }
        }
    
    async def apply_filter(
        self,
        video_path: str,
        filter_name: str,
        intensity: float = 0.5,
        output_format: str = "mp4"
    ) -> str:
        """Applique un filtre à une vidéo"""
        try:
            filter_config = self.filters.get(filter_name)
            if not filter_config:
                raise Exception(f"Filter {filter_name} not found")
            
            output_filename = f"{Path(video_path).stem}_filtered_{filter_name}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vf", filter_config["filter"],
                "-c:a", "copy",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception(f"Filter application failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error applying filter: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def add_overlay(
        self,
        video_path: str,
        overlay_path: str,
        position: str = "center",
        opacity: float = 0.7,
        start_time: float = 0,
        duration: Optional[float] = None
    ) -> str:
        """Ajoute un overlay (logo, texte, animation)"""
        positions = {
            "top-left": "10:10",
            "top-right": "W-w-10:10",
            "bottom-left": "10:H-h-10",
            "bottom-right": "W-w-10:H-h-10",
            "center": "(W-w)/2:(H-h)/2"
        }
        
        try:
            output_filename = f"{Path(video_path).stem}_overlay.{Path(video_path).suffix}"
            output_path = self.temp_dir / output_filename
            
            overlay_position = positions.get(position, positions["center"])
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-i", overlay_path,
                "-filter_complex",
                f"[1:v]format=rgba,colorchannelmixer=aa={opacity}[watermark];[0:v][watermark]overlay={overlay_position}:enable='between(t,{start_time},{duration or 99999})'",
                "-codec:a", "copy",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Overlay addition failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error adding overlay: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def add_text(
        self,
        video_path: str,
        text: str,
        font_size: int = 24,
        font_color: str = "white",
        position: str = "bottom",
        start_time: float = 0,
        duration: Optional[float] = None
    ) -> str:
        """Ajoute du texte animé à une vidéo"""
        positions = {
            "top": "10:10",
            "bottom": "10:H-th-10",
            "center": "(W-tw)/2:(H-th)/2"
        }
        
        try:
            output_filename = f"{Path(video_path).stem}_text.{Path(video_path).suffix}"
            output_path = self.temp_dir / output_filename
            
            text_position = positions.get(position, positions["bottom"])
            
            # Échapper le texte pour FFmpeg
            escaped_text = text.replace("'", "'\\\\''")
            
            drawtext_filter = (
                f"drawtext=text='{escaped_text}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:"
                f"fontsize={font_size}:fontcolor={font_color}:x={text_position.split(':')[0]}:"
                f"y={text_position.split(':')[1]}:enable='between(t,{start_time},{duration or 99999})'"
            )
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vf", drawtext_filter,
                "-c:a", "copy",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Text addition failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error adding text: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def add_transition(
        self,
        video1_path: str,
        video2_path: str,
        transition_type: str = "fade",
        duration: float = 1.0
    ) -> str:
        """Ajoute une transition entre deux vidéos"""
        transitions = {
            "fade": "fade=type=out:duration={d}:start_time=0,fade=type=in:duration={d}:start_time={t}",
            "wipe": "wipe=type=left",
            "slide": "slide=type=left"
        }
        
        try:
            output_filename = f"transition_{Path(video1_path).stem}_{Path(video2_path).stem}.mp4"
            output_path = self.temp_dir / output_filename
            
            # Créer un fichier de liste
            list_path = self.temp_dir / f"list_{Path(video1_path).stem}.txt"
            with open(list_path, "w") as f:
                f.write(f"file '{video1_path}'\n")
                f.write(f"file '{video2_path}'\n")
            
            cmd = [
                self.ffmpeg_path,
                "-f", "concat",
                "-safe", "0",
                "-i", str(list_path),
                "-c", "copy",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Transition addition failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error adding transition: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
            if list_path.exists():
                list_path.unlink()
    
    async def add_slow_motion(
        self,
        video_path: str,
        speed: float = 0.5
    ) -> str:
        """Ajoute un effet ralenti"""
        try:
            output_filename = f"{Path(video_path).stem}_slowmo.{Path(video_path).suffix}"
            output_path = self.temp_dir / output_filename
            
            tempo = 1 / speed
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-filter_complex",
                f"[0:v]setpts={tempo}*PTS[v];[0:a]atempo={speed}[a]",
                "-map", "[v]",
                "-map", "[a]",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Slow motion addition failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error adding slow motion: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    async def add_speed_ramp(
        self,
        video_path: str,
        start_speed: float,
        end_speed: float,
        duration: float
    ) -> str:
        """Ajoute un effet de vitesse variable"""
        try:
            output_filename = f"{Path(video_path).stem}_speedramp.{Path(video_path).suffix}"
            output_path = self.temp_dir / output_filename
            
            # FFmpeg complex filter for speed ramp
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-filter_complex",
                f"[0:v]setpts={start_speed}*PTS[v];[0:a]atempo={start_speed}[a]",
                "-map", "[v]",
                "-map", "[a]",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Speed ramp addition failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error adding speed ramp: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()

# Instance singleton
video_effects_service = VideoEffectsService()