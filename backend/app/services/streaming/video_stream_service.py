# backend/app/services/streaming/video_stream_service.py
import os
import subprocess
import asyncio
import uuid
import shutil
import json
from typing import Optional, Dict, List, Any
from pathlib import Path
import logging
from datetime import datetime, timedelta
import tempfile

from app.config import settings
from app.database import db
from app.services.storage.s3_service import s3_service

logger = logging.getLogger(__name__)

class VideoStreamService:
    """Service complet de streaming vidéo avec HLS, DASH et CDN"""
    
    def __init__(self):
        self.ffmpeg_path = settings.FFMPEG_PATH
        
        # Utiliser le dossier temp du système (compatible Windows/Linux/macOS)
        temp_base = Path(tempfile.gettempdir()) / "konka_stream"
        self.temp_dir = temp_base
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Qualités de transcodage pour HLS
        self.hls_qualities = [
            {"name": "1080p", "width": 1920, "height": 1080, "bitrate": "4500k", "audio_bitrate": "128k"},
            {"name": "720p", "width": 1280, "height": 720, "bitrate": "2500k", "audio_bitrate": "128k"},
            {"name": "480p", "width": 854, "height": 480, "bitrate": "1000k", "audio_bitrate": "96k"},
            {"name": "360p", "width": 640, "height": 360, "bitrate": "500k", "audio_bitrate": "64k"},
            {"name": "240p", "width": 426, "height": 240, "bitrate": "250k", "audio_bitrate": "64k"},
        ]
        
        # Qualités pour DASH
        self.dash_qualities = [
            {"name": "1080p", "width": 1920, "height": 1080, "bitrate": "4500k"},
            {"name": "720p", "width": 1280, "height": 720, "bitrate": "2500k"},
            {"name": "480p", "width": 854, "height": 480, "bitrate": "1000k"},
            {"name": "360p", "width": 640, "height": 360, "bitrate": "500k"},
        ]
    
    async def transcode_to_hls(
        self,
        input_path: str,
        video_id: str,
        output_bucket: str = "videos",
        segment_duration: int = 6,
        use_cdn: bool = True
    ) -> Dict[str, Any]:
        """Transcode une vidéo en HLS (HTTP Live Streaming) avec multi-qualités"""
        try:
            output_dir = self.temp_dir / video_id
            output_dir.mkdir(exist_ok=True)
            
            # Fichier manifeste principal
            master_playlist = output_dir / "master.m3u8"
            variant_playlists = []
            segment_files = []
            
            # Transcoder chaque qualité
            for quality in self.hls_qualities:
                variant_dir = output_dir / quality["name"]
                variant_dir.mkdir(exist_ok=True)
                
                variant_playlist = f"{quality['name']}.m3u8"
                variant_path = variant_dir / variant_playlist
                segment_pattern = f"{variant_dir}/segment_%03d.ts"
                
                # Commande FFmpeg pour HLS
                cmd = [
                    self.ffmpeg_path,
                    "-i", input_path,
                    "-vf", f"scale={quality['width']}:{quality['height']}:force_original_aspect_ratio=decrease,pad={quality['width']}:{quality['height']}:(ow-iw)/2:(oh-ih)/2",
                    "-c:v", "libx264",
                    "-crf", "23",
                    "-preset", "medium",
                    "-g", str(segment_duration * 2),
                    "-keyint_min", str(segment_duration),
                    "-sc_threshold", "0",
                    "-b:v", quality["bitrate"],
                    "-maxrate", quality["bitrate"],
                    "-bufsize", f"{int(quality['bitrate'].replace('k', '')) * 2}k",
                    "-c:a", "aac",
                    "-b:a", quality["audio_bitrate"],
                    "-f", "hls",
                    "-hls_time", str(segment_duration),
                    "-hls_list_size", "0",
                    "-hls_segment_filename", segment_pattern,
                    "-hls_playlist_type", "vod",
                    str(variant_path)
                ]
                
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await process.communicate()
                
                if process.returncode != 0:
                    logger.error(f"FFmpeg error for quality {quality['name']}: {stderr.decode()}")
                    raise Exception(f"FFmpeg error for quality {quality['name']}")
                
                # Collecter les fichiers de segments
                segments = list(variant_dir.glob("segment_*.ts"))
                segment_files.extend(segments)
                
                variant_playlists.append({
                    "name": quality["name"],
                    "playlist": variant_playlist,
                    "bitrate": quality["bitrate"],
                    "width": quality["width"],
                    "height": quality["height"],
                    "segments_count": len(segments)
                })
            
            # Générer le manifeste master
            with open(master_playlist, "w") as f:
                f.write("#EXTM3U\n")
                f.write("#EXT-X-VERSION:3\n")
                for variant in variant_playlists:
                    bandwidth = int(variant["bitrate"].replace('k', '000'))
                    f.write(f"#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={variant['width']}x{variant['height']}\n")
                    f.write(f"{variant['name']}/{variant['playlist']}\n")
            
            # Upload vers S3 avec CDN
            urls = await self._upload_to_s3(output_dir, video_id, output_bucket, "hls")
            
            # Nettoyer les fichiers temporaires
            shutil.rmtree(output_dir)
            
            # Sauvegarder les informations dans la base de données
            cdn_url = f"{settings.CLOUDFRONT_URL}/hls/{video_id}/master.m3u8" if use_cdn else urls.get("master")
            
            await db.table('videos').update({
                "hls_url": cdn_url,
                "hls_master_url": cdn_url,
                "hls_qualities": variant_playlists,
                "stream_status": "ready",
                "stream_type": "hls",
                "stream_updated_at": datetime.now().isoformat()
            }).eq('id', video_id).execute()
            
            # Créer une entrée dans la table des streams
            await db.table('video_streams').insert({
                "video_id": video_id,
                "stream_type": "hls",
                "master_url": cdn_url,
                "qualities": variant_playlists,
                "segment_count": len(segment_files),
                "created_at": datetime.now().isoformat()
            }).execute()
            
            logger.info(f"Video {video_id} transcoded to HLS successfully")
            
            return {
                "master_url": cdn_url,
                "qualities": variant_playlists,
                "segment_count": len(segment_files)
            }
            
        except Exception as e:
            logger.error(f"Error transcoding video to HLS: {e}")
            raise
    
    async def transcode_to_dash(
        self,
        input_path: str,
        video_id: str,
        output_bucket: str = "videos",
        segment_duration: int = 4,
        use_cdn: bool = True
    ) -> Dict[str, Any]:
        """Transcode une vidéo en DASH (Dynamic Adaptive Streaming over HTTP)"""
        try:
            output_dir = self.temp_dir / f"{video_id}_dash"
            output_dir.mkdir(exist_ok=True)
            
            # Préparer les représentations pour DASH
            representations = []
            
            for quality in self.dash_qualities:
                representation = {
                    "id": quality["name"],
                    "width": quality["width"],
                    "height": quality["height"],
                    "bitrate": quality["bitrate"],
                    "codec": "libx264"
                }
                representations.append(representation)
            
            # Commande FFmpeg pour DASH
            cmd = [
                self.ffmpeg_path,
                "-i", input_path,
                "-c:v", "libx264",
                "-c:a", "aac",
                "-map", "0",
                "-f", "dash",
                "-seg_duration", str(segment_duration),
                "-init_seg_name", "init-$RepresentationID$.mp4",
                "-media_seg_name", "chunk-$RepresentationID$-$Number$.m4s",
                "-adaptation_sets", "id=0,streams=v id=1,streams=a",
                f"{output_dir}/manifest.mpd"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"FFmpeg DASH error: {stderr.decode()}")
                raise Exception(f"FFmpeg DASH error")
            
            # Upload vers S3 avec CDN
            urls = await self._upload_to_s3(output_dir, video_id, output_bucket, "dash")
            
            # Nettoyer
            shutil.rmtree(output_dir)
            
            cdn_url = f"{settings.CLOUDFRONT_URL}/dash/{video_id}/manifest.mpd" if use_cdn else urls.get("manifest")
            
            await db.table('videos').update({
                "dash_url": cdn_url,
                "stream_status": "ready",
                "stream_type": "dash",
                "stream_updated_at": datetime.now().isoformat()
            }).eq('id', video_id).execute()
            
            await db.table('video_streams').insert({
                "video_id": video_id,
                "stream_type": "dash",
                "master_url": cdn_url,
                "qualities": representations,
                "created_at": datetime.now().isoformat()
            }).execute()
            
            return {
                "manifest_url": cdn_url,
                "qualities": representations
            }
            
        except Exception as e:
            logger.error(f"Error transcoding video to DASH: {e}")
            raise
    
    async def transcode_adaptive(
        self,
        input_path: str,
        video_id: str,
        output_bucket: str = "videos",
        formats: List[str] = ["hls", "dash"]
    ) -> Dict[str, Any]:
        """Transcode une vidéo dans plusieurs formats adaptatifs"""
        results = {}
        
        try:
            # Transcodage HLS
            if "hls" in formats:
                results["hls"] = await self.transcode_to_hls(input_path, video_id, output_bucket)
            
            # Transcodage DASH
            if "dash" in formats:
                results["dash"] = await self.transcode_to_dash(input_path, video_id, output_bucket)
            
            # Mettre à jour le statut de la vidéo
            await db.table('videos').update({
                "stream_status": "ready",
                "stream_formats": formats,
                "stream_updated_at": datetime.now().isoformat()
            }).eq('id', video_id).execute()
            
            return results
            
        except Exception as e:
            logger.error(f"Error in adaptive transcoding: {e}")
            await db.table('videos').update({
                "stream_status": "failed",
                "stream_error": str(e)
            }).eq('id', video_id).execute()
            raise
    
    async def _upload_to_s3(
        self,
        output_dir: Path,
        video_id: str,
        bucket: str,
        stream_type: str
    ) -> Dict[str, str]:
        """Upload les fichiers vers S3 avec CDN"""
        try:
            uploaded_urls = {}
            files_count = 0
            
            for file_path in output_dir.rglob("*"):
                if file_path.is_file():
                    relative_path = file_path.relative_to(output_dir)
                    s3_key = f"{stream_type}/{video_id}/{relative_path}"
                    
                    url = await s3_service.upload_file(
                        bucket=bucket,
                        key=s3_key,
                        file_path=str(file_path),
                        content_type=self._get_content_type(file_path.suffix),
                        cache_control="public, max-age=31536000"
                    )
                    
                    if relative_path == Path("master.m3u8") or relative_path == Path("manifest.mpd"):
                        uploaded_urls["master"] = url
                    elif relative_path.suffix == ".m3u8":
                        uploaded_urls[str(relative_path)] = url
                    else:
                        uploaded_urls[str(relative_path)] = url
                    
                    files_count += 1
            
            logger.info(f"Uploaded {files_count} files for video {video_id} to S3")
            return uploaded_urls
            
        except Exception as e:
            logger.error(f"Error uploading to S3: {e}")
            raise
    
    def _get_content_type(self, extension: str) -> str:
        """Retourne le content type en fonction de l'extension"""
        content_types = {
            ".m3u8": "application/vnd.apple.mpegurl",
            ".ts": "video/MP2T",
            ".mpd": "application/dash+xml",
            ".mp4": "video/mp4",
            ".m4s": "video/iso.segment",
            ".webm": "video/webm"
        }
        return content_types.get(extension, "application/octet-stream")
    
    async def generate_thumbnails(
        self,
        video_path: str,
        video_id: str,
        count: int = 5,
        output_bucket: str = "videos"
    ) -> List[str]:
        """Génère plusieurs miniatures à différents timestamps"""
        try:
            # Récupérer la durée de la vidéo
            duration = await self._get_video_duration(video_path)
            
            # Calculer les timestamps
            timestamps = []
            for i in range(count):
                timestamp = (duration / (count + 1)) * (i + 1)
                timestamps.append(timestamp)
            
            thumbnail_urls = []
            thumb_dir = self.temp_dir / f"{video_id}_thumbs"
            thumb_dir.mkdir(exist_ok=True)
            
            for i, timestamp in enumerate(timestamps):
                thumbnail_path = thumb_dir / f"thumb_{i+1}.jpg"
                
                # Commande FFmpeg pour extraire la miniature
                cmd = [
                    self.ffmpeg_path,
                    "-ss", str(timestamp),
                    "-i", video_path,
                    "-vframes", "1",
                    "-vf", "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2",
                    "-q:v", "2",
                    str(thumbnail_path)
                ]
                
                process = await asyncio.create_subprocess_exec(*cmd)
                await process.wait()
                
                # Upload vers S3
                s3_key = f"thumbnails/{video_id}/thumb_{i+1}.jpg"
                url = await s3_service.upload_file(
                    bucket=output_bucket,
                    key=s3_key,
                    file_path=str(thumbnail_path),
                    content_type="image/jpeg",
                    cache_control="public, max-age=31536000"
                )
                
                thumbnail_urls.append(url)
            
            # Nettoyer
            shutil.rmtree(thumb_dir)
            
            # Sauvegarder les miniatures
            await db.table('videos').update({
                "thumbnail_urls": thumbnail_urls,
                "thumbnail_count": len(thumbnail_urls)
            }).eq('id', video_id).execute()
            
            return thumbnail_urls
            
        except Exception as e:
            logger.error(f"Error generating thumbnails: {e}")
            return []
    
    async def generate_animated_thumbnail(
        self,
        video_path: str,
        video_id: str,
        duration: int = 5,
        fps: int = 10
    ) -> str:
        """Génère une miniature animée (GIF/WebP)"""
        try:
            output_path = self.temp_dir / f"{video_id}_animated.gif"
            
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vf", f"fps={fps},scale=320:-1",
                "-t", str(duration),
                "-loop", "0",
                str(output_path)
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd)
            await process.wait()
            
            # Upload vers S3
            s3_key = f"thumbnails/{video_id}/animated.gif"
            url = await s3_service.upload_file(
                bucket="videos",
                key=s3_key,
                file_path=str(output_path),
                content_type="image/gif",
                cache_control="public, max-age=31536000"
            )
            
            output_path.unlink()
            
            return url
            
        except Exception as e:
            logger.error(f"Error generating animated thumbnail: {e}")
            return ""
    
    async def _get_video_duration(self, video_path: str) -> float:
        """Récupère la durée d'une vidéo"""
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
            
            _, stderr = await process.communicate()
            
            import re
            match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})", stderr.decode())
            if match:
                hours, minutes, seconds = match.groups()
                return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
            
            return 0
            
        except Exception as e:
            logger.error(f"Error getting video duration: {e}")
            return 0
    
    async def get_stream_url(
        self,
        video_id: str,
        quality: Optional[str] = None,
        stream_type: str = "hls"
    ) -> str:
        """Récupère l'URL de streaming pour une vidéo"""
        try:
            video = await db.table('videos').select(f'{stream_type}_url, hls_qualities, dash_qualities')\
                .eq('id', video_id).execute()
            
            if not video.data:
                raise Exception("Video not found")
            
            if quality and stream_type == "hls" and video.data[0].get('hls_qualities'):
                for q in video.data[0]['hls_qualities']:
                    if q['name'] == quality:
                        return f"{video.data[0]['hls_url'].replace('master.m3u8', f'{quality}/playlist.m3u8')}"
            
            if quality and stream_type == "dash" and video.data[0].get('dash_qualities'):
                return f"{video.data[0]['dash_url']}#track={quality}"
            
            return video.data[0].get(f'{stream_type}_url')
            
        except Exception as e:
            logger.error(f"Error getting stream URL: {e}")
            raise

# Instance singleton
video_stream_service = VideoStreamService()