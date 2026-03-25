# backend/app/services/transcoding/ffmpeg_service.py
import os
import subprocess
import asyncio
import uuid
import shutil
import json
import re
from typing import Optional, Dict, List, Any, Tuple
from pathlib import Path
import logging
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

class FFmpegService:
    """Service complet de transcodage vidéo/audio avec FFmpeg"""
    
    def __init__(self):
        self.ffmpeg_path = settings.FFMPEG_PATH
        self.ffprobe_path = settings.FFPROBE_PATH or "ffprobe"
        self.temp_dir = Path("/tmp/konka_transcode")
        self.temp_dir.mkdir(exist_ok=True)
        
        # Configurations de compression
        self.video_presets = {
            "ultrafast": {"preset": "ultrafast", "crf": 28},
            "veryfast": {"preset": "veryfast", "crf": 26},
            "fast": {"preset": "fast", "crf": 23},
            "medium": {"preset": "medium", "crf": 23},
            "slow": {"preset": "slow", "crf": 21},
            "veryslow": {"preset": "veryslow", "crf": 18},
        }
        
        self.audio_bitrates = {
            "low": "64k",
            "medium": "128k",
            "high": "192k",
            "very_high": "320k"
        }
    
    # ==================== MÉTADONNÉES ====================
    
    async def get_media_info(self, file_path: str) -> Dict[str, Any]:
        """Récupère les métadonnées complètes d'un fichier média"""
        try:
            cmd = [
                self.ffprobe_path,
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                file_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"FFprobe error: {stderr.decode()}")
            
            data = json.loads(stdout.decode())
            
            result = {
                "format": data.get("format", {}),
                "streams": [],
                "duration": None,
                "bitrate": None,
                "size": None
            }
            
            for stream in data.get("streams", []):
                stream_info = {
                    "index": stream.get("index"),
                    "codec_type": stream.get("codec_type"),
                    "codec_name": stream.get("codec_name"),
                    "codec_long_name": stream.get("codec_long_name"),
                    "profile": stream.get("profile"),
                    "width": stream.get("width"),
                    "height": stream.get("height"),
                    "r_frame_rate": stream.get("r_frame_rate"),
                    "bit_rate": stream.get("bit_rate"),
                    "sample_rate": stream.get("sample_rate"),
                    "channels": stream.get("channels"),
                    "channel_layout": stream.get("channel_layout"),
                    "duration": stream.get("duration")
                }
                result["streams"].append(stream_info)
                
                if stream_info["codec_type"] == "video":
                    result["video"] = stream_info
                elif stream_info["codec_type"] == "audio":
                    result["audio"] = stream_info
            
            result["duration"] = float(data.get("format", {}).get("duration", 0))
            result["bitrate"] = int(data.get("format", {}).get("bit_rate", 0))
            result["size"] = int(data.get("format", {}).get("size", 0))
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting media info: {e}")
            raise
    
    # ==================== TRANSCODAGE VIDÉO ====================
    
    async def transcode_video(
        self,
        input_path: str,
        output_format: str = "mp4",
        video_codec: str = "libx264",
        audio_codec: str = "aac",
        width: Optional[int] = None,
        height: Optional[int] = None,
        bitrate: Optional[str] = None,
        fps: Optional[int] = None,
        preset: str = "medium",
        crf: Optional[int] = None,
        audio_bitrate: str = "128k",
        start_time: Optional[float] = None,
        duration: Optional[float] = None,
        **kwargs
    ) -> str:
        """Transcode une vidéo avec options personnalisées"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [self.ffmpeg_path, "-i", input_path]
            
            # Trim video
            if start_time:
                cmd.extend(["-ss", str(start_time)])
            if duration:
                cmd.extend(["-t", str(duration)])
            
            # Video filters
            filters = []
            if width or height:
                scale_filter = f"scale={width or -1}:{height or -1}"
                filters.append(scale_filter)
            
            if filters:
                cmd.extend(["-vf", ",".join(filters)])
            
            # Video codec
            cmd.extend(["-c:v", video_codec])
            
            # Preset et CRF
            preset_config = self.video_presets.get(preset, self.video_presets["medium"])
            cmd.extend(["-preset", preset_config["preset"]])
            
            if crf:
                cmd.extend(["-crf", str(crf)])
            else:
                cmd.extend(["-crf", str(preset_config["crf"])])
            
            if bitrate:
                cmd.extend(["-b:v", bitrate])
            
            if fps:
                cmd.extend(["-r", str(fps)])
            
            # Audio codec
            cmd.extend(["-c:a", audio_codec])
            cmd.extend(["-b:a", audio_bitrate])
            
            # Output
            cmd.append(str(output_path))
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"FFmpeg error: {stderr.decode()}")
            
            # Lire le fichier
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error transcoding video: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== TRANSCODAGE AUDIO ====================
    
    async def transcode_audio(
        self,
        input_path: str,
        output_format: str = "mp3",
        audio_codec: str = "libmp3lame",
        bitrate: str = "192k",
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
        normalize: bool = False,
        start_time: Optional[float] = None,
        duration: Optional[float] = None,
        **kwargs
    ) -> str:
        """Transcode un fichier audio avec options personnalisées"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [self.ffmpeg_path, "-i", input_path]
            
            # Trim audio
            if start_time:
                cmd.extend(["-ss", str(start_time)])
            if duration:
                cmd.extend(["-t", str(duration)])
            
            # Audio filters
            filters = []
            if normalize:
                filters.append("loudnorm")
            
            if filters:
                cmd.extend(["-af", ",".join(filters)])
            
            # Audio codec
            cmd.extend(["-c:a", audio_codec])
            cmd.extend(["-b:a", bitrate])
            
            if sample_rate:
                cmd.extend(["-ar", str(sample_rate)])
            
            if channels:
                cmd.extend(["-ac", str(channels)])
            
            cmd.append(str(output_path))
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"FFmpeg error: {stderr.decode()}")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error transcoding audio: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== EXTRACTION AUDIO ====================
    
    async def extract_audio(
        self,
        video_path: str,
        output_format: str = "mp3",
        audio_bitrate: str = "192k"
    ) -> str:
        """Extrait l'audio d'une vidéo"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vn",
                "-c:a", "libmp3lame" if output_format == "mp3" else "aac",
                "-b:a", audio_bitrate,
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Audio extraction failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error extracting audio: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== GÉNÉRATION DE VAGUES (WAVEFORM) ====================
    
    async def generate_waveform(
        self,
        audio_path: str,
        width: int = 1000,
        height: int = 200,
        colors: Tuple[str, str] = ("#FF6B35", "#FF4D1E"),
        background: str = "transparent"
    ) -> str:
        """Génère une image de waveform à partir d'un fichier audio"""
        try:
            output_filename = f"{uuid.uuid4()}.png"
            output_path = self.temp_dir / output_filename
            
            # Construire le filtre showwavespic
            color_filter = f"color={background}[bg];[bg][0:a]showwavespic=s={width}x{height}:colors={colors[0]}|{colors[1]}"
            
            cmd = [
                self.ffmpeg_path,
                "-i", audio_path,
                "-filter_complex", color_filter,
                "-frames:v", "1",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Waveform generation failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error generating waveform: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== CONVERSION FORMATS ====================
    
    async def convert_to_gif(
        self,
        video_path: str,
        width: int = 480,
        fps: int = 10,
        duration: Optional[float] = None,
        start_time: Optional[float] = None
    ) -> str:
        """Convertit une vidéo en GIF"""
        try:
            output_filename = f"{uuid.uuid4()}.gif"
            output_path = self.temp_dir / output_filename
            
            cmd = [self.ffmpeg_path, "-i", video_path]
            
            if start_time:
                cmd.extend(["-ss", str(start_time)])
            if duration:
                cmd.extend(["-t", str(duration)])
            
            palette_path = self.temp_dir / f"{uuid.uuid4()}_palette.png"
            
            # Générer la palette
            palette_cmd = cmd + [
                "-vf", f"fps={fps},scale={width}:-1:flags=lanczos,palettegen",
                "-y", str(palette_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*palette_cmd)
            await process.wait()
            
            # Générer le GIF
            gif_cmd = cmd + [
                "-i", str(palette_path),
                "-lavfi", f"fps={fps},scale={width}:-1:flags=lanczos[x];[x][1:v]paletteuse",
                "-y", str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*gif_cmd)
            await process.wait()
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            # Nettoyer
            if palette_path.exists():
                palette_path.unlink()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error converting to GIF: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== CONCATÉNATION ====================
    
    async def concatenate_videos(
        self,
        video_paths: List[str],
        output_format: str = "mp4"
    ) -> str:
        """Concatène plusieurs vidéos"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            # Créer un fichier de liste
            list_path = self.temp_dir / f"{uuid.uuid4()}.txt"
            with open(list_path, "w") as f:
                for path in video_paths:
                    f.write(f"file '{path}'\n")
            
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
                raise Exception("Video concatenation failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            # Nettoyer
            list_path.unlink()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error concatenating videos: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== AJOUTER UN SON ====================
    
    async def add_audio_to_video(
        self,
        video_path: str,
        audio_path: str,
        output_format: str = "mp4",
        audio_volume: float = 1.0,
        video_volume: float = 0.0
    ) -> str:
        """Ajoute une piste audio à une vidéo"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-i", audio_path,
                "-filter_complex",
                f"[1:a]volume={audio_volume}[a1];[0:a]volume={video_volume}[a0];[a0][a1]amix=inputs=2:duration=first",
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Audio addition failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error adding audio to video: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== AJOUTER DES SOUS-TITRES ====================
    
    async def add_subtitles(
        self,
        video_path: str,
        subtitles_path: str,
        output_format: str = "mp4",
        font_size: int = 24,
        font_color: str = "white"
    ) -> str:
        """Ajoute des sous-titres à une vidéo"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vf", f"subtitles={subtitles_path}:force_style='FontSize={font_size},PrimaryColour=&H{font_color.replace('#', '')}'",
                "-c:a", "copy",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Subtitles addition failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error adding subtitles: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== ROGNER VIDÉO ====================
    
    async def crop_video(
        self,
        video_path: str,
        x: int,
        y: int,
        width: int,
        height: int,
        output_format: str = "mp4"
    ) -> str:
        """Rogne une vidéo"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vf", f"crop={width}:{height}:{x}:{y}",
                "-c:a", "copy",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Video cropping failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error cropping video: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== AJOUTER UN FILTRE ====================
    
    async def apply_filter(
        self,
        video_path: str,
        filter_type: str,
        output_format: str = "mp4",
        **kwargs
    ) -> str:
        """Applique un filtre vidéo (noir/blanc, sépia, flou, etc.)"""
        filters = {
            "grayscale": "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3",
            "sepia": "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
            "blur": "boxblur=5:1",
            "sharpen": "unsharp=5:5:1.0:5:5:0.0",
            "negate": "negate",
            "vignette": "vignette=PI/4",
            "edge": "edgedetect",
            "emboss": "convolution='-1 -1 -1 -1 8 -1 -1 -1 -1'"
        }
        
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            filter_cmd = filters.get(filter_type)
            if not filter_cmd:
                raise Exception(f"Unknown filter: {filter_type}")
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vf", filter_cmd,
                "-c:a", "copy",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception(f"Filter {filter_type} application failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error applying filter: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== AJOUTER UN LOGO / WATERMARK ====================
    
    async def add_watermark(
        self,
        video_path: str,
        watermark_path: str,
        position: str = "bottom-right",
        opacity: float = 0.5,
        output_format: str = "mp4"
    ) -> str:
        """Ajoute un watermark à une vidéo"""
        positions = {
            "top-left": "10:10",
            "top-right": "W-w-10:10",
            "bottom-left": "10:H-h-10",
            "bottom-right": "W-w-10:H-h-10",
            "center": "(W-w)/2:(H-h)/2"
        }
        
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            overlay_position = positions.get(position, positions["bottom-right"])
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-i", watermark_path,
                "-filter_complex",
                f"[1:v]format=rgba,colorchannelmixer=aa={opacity}[watermark];[0:v][watermark]overlay={overlay_position}",
                "-codec:a", "copy",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Watermark addition failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error adding watermark: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== CHANGER LA VITESSE ====================
    
    async def change_speed(
        self,
        video_path: str,
        speed: float,
        output_format: str = "mp4"
    ) -> str:
        """Change la vitesse de lecture d'une vidéo (ralenti/accéléré)"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            if speed < 1:
                # Ralenti
                tempo = 1 / speed
                filter_cmd = f"setpts={tempo}*PTS"
                audio_filter = f"atempo={speed}"
            else:
                # Accéléré
                filter_cmd = f"setpts={1/speed}*PTS"
                audio_filter = f"atempo={speed}"
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-filter_complex",
                f"[0:v]{filter_cmd}[v];[0:a]{audio_filter}[a]",
                "-map", "[v]",
                "-map", "[a]",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Speed change failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error changing speed: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== EXTRAIRE UNE IMAGE ====================
    
    async def extract_frame(
        self,
        video_path: str,
        timestamp: float,
        output_format: str = "jpg",
        width: Optional[int] = None,
        height: Optional[int] = None
    ) -> str:
        """Extrait une image à un timestamp donné"""
        try:
            output_filename = f"{uuid.uuid4()}.{output_format}"
            output_path = self.temp_dir / output_filename
            
            cmd = [
                self.ffmpeg_path,
                "-ss", str(timestamp),
                "-i", video_path,
                "-vframes", "1"
            ]
            
            if width or height:
                cmd.extend(["-vf", f"scale={width or -1}:{height or -1}"])
            
            cmd.append(str(output_path))
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            if process.returncode != 0:
                raise Exception("Frame extraction failed")
            
            with open(output_path, "rb") as f:
                file_content = f.read()
            
            return file_content
            
        except Exception as e:
            logger.error(f"Error extracting frame: {e}")
            raise
        finally:
            if output_path.exists():
                output_path.unlink()
    
    # ==================== NETTOYAGE ====================
    
    async def cleanup(self):
        """Nettoie les fichiers temporaires"""
        try:
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
                self.temp_dir.mkdir(exist_ok=True)
        except Exception as e:
            logger.error(f"Error cleaning temp files: {e}")

# Instance singleton
ffmpeg_service = FFmpegService()