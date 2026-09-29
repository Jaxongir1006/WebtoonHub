import io
import json
import os
from pathlib import Path
from typing import Optional
from minio import Minio
from PIL import Image, ImageOps
from app.core.config import settings

# MinIO client
minio_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ROOT_USER,
    secret_key=settings.MINIO_ROOT_PASSWORD,
    secure=settings.MINIO_SECURE
)


def ensure_bucket_exists(bucket_name: str, public: bool = True) -> None:
    """Ensure bucket exists and optionally make it publicly readable for images"""
    try:
        if not minio_client.bucket_exists(bucket_name):
            minio_client.make_bucket(bucket_name)

        if public:
            # Set public read policy so browser can display images without pre-signed URLs
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": ["*"]},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                    }
                ]
            }
            minio_client.set_bucket_policy(bucket_name, json.dumps(policy))
    except Exception as e:
        print(f"[Storage Warning] Could not ensure bucket '{bucket_name}': {e}")


import socket

def _is_minio_reachable() -> bool:
    try:
        endpoint = settings.MINIO_ENDPOINT.split("/")[0]
        if ":" in endpoint:
            host, port_str = endpoint.split(":", 1)
            port = int(port_str)
        else:
            host = endpoint
            port = 443 if settings.MINIO_SECURE else 80
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except Exception:
        return False


def init_storage() -> None:
    """Initialize all application buckets on startup"""
    try:
        if not _is_minio_reachable():
            print("[Storage Info] MinIO endpoint offline; local storage fallback active.")
            return

        buckets = [
            settings.MINIO_BUCKET_COVERS,
            settings.MINIO_BUCKET_CHAPTERS,
            settings.MINIO_BUCKET_SHOP
        ]
        for b in buckets:
            ensure_bucket_exists(b, public=True)
    except Exception as e:
        print(f"[Storage Warning] MinIO init skipped: {e}")


class StorageService:
    @staticmethod
    def optimized_image_url(url: str) -> str:
        """Use a local WebP copy when one exists for a chapter page."""
        if not url.startswith("/content/") or not url.lower().endswith((".jpg", ".jpeg", ".png")):
            return url
        root = Path(__file__).resolve().parents[2] / "public_content"
        original = (root / url.removeprefix("/content/")).resolve()
        if not original.is_relative_to(root.resolve()):
            return url
        optimized = original.with_suffix(".webp")
        return f"/content/{optimized.relative_to(root).as_posix()}" if optimized.is_file() else url

    @staticmethod
    def upload_file(
        bucket_name: str,
        object_name: str,
        data: bytes,
        content_type: str = "image/webp"
    ) -> str:
        """Upload raw bytes to local public_content storage and MinIO (if available) and return public URL"""
        if bucket_name == settings.MINIO_BUCKET_CHAPTERS and content_type.startswith("image/"):
            try:
                with Image.open(io.BytesIO(data)) as source:
                    image = ImageOps.exif_transpose(source)
                    if image.width > 1200:
                        image = image.resize((1200, round(image.height * 1200 / image.width)), Image.Resampling.LANCZOS)
                    if image.mode not in ("RGB", "RGBA"):
                        image = image.convert("RGB")
                    optimized = io.BytesIO()
                    image.save(optimized, format="WEBP", quality=80, method=6)
                    if optimized.tell() < len(data):
                        data = optimized.getvalue()
                        object_name = str(Path(object_name).with_suffix(".webp")).replace("\\", "/")
                        content_type = "image/webp"
            except Exception as exc:
                print(f"[Storage Warning] Image optimization skipped for {object_name}: {exc}")

        clean_name = object_name.lstrip("/\\")

        # 1. Always save locally to backend/public_content
        try:
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            content_dir = os.path.join(root_dir, "public_content")
            local_path = os.path.join(content_dir, clean_name)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(data)
        except Exception as e:
            print(f"[Storage Warning] Local save failed for {object_name}: {e}")

        # 2. Upload to MinIO if running
        if _is_minio_reachable():
            try:
                data_stream = io.BytesIO(data)
                minio_client.put_object(
                    bucket_name=bucket_name,
                    object_name=object_name,
                    data=data_stream,
                    length=len(data),
                    content_type=content_type
                )
            except Exception as e:
                print(f"[Storage Error] MinIO upload failed: {e}")

        clean_url = clean_name.replace("\\", "/")
        return f"/content/{clean_url}"

    @staticmethod
    def delete_file(bucket_name: str, object_name: str) -> None:
        """Delete an object from local storage and MinIO"""
        try:
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            clean_name = object_name.lstrip("/\\")
            local_path = os.path.join(root_dir, "public_content", clean_name)
            if os.path.exists(local_path):
                os.remove(local_path)
        except Exception as e:
            print(f"[Storage Warning] Local delete failed: {e}")

        if not _is_minio_reachable():
            return

        try:
            minio_client.remove_object(bucket_name, object_name)
        except Exception as e:
            print(f"[Storage Warning] Could not delete '{object_name}' from '{bucket_name}': {e}")
