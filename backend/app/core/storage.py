import io
import json
from typing import Optional
from minio import Minio
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


def init_storage() -> None:
    """Initialize all application buckets on startup"""
    buckets = [
        settings.MINIO_BUCKET_COVERS,
        settings.MINIO_BUCKET_CHAPTERS,
        settings.MINIO_BUCKET_SHOP
    ]
    for b in buckets:
        ensure_bucket_exists(b, public=True)


class StorageService:
    @staticmethod
    def upload_file(
        bucket_name: str,
        object_name: str,
        data: bytes,
        content_type: str = "image/webp"
    ) -> str:
        """Upload raw bytes to MinIO bucket and return public URL"""
        data_stream = io.BytesIO(data)
        minio_client.put_object(
            bucket_name=bucket_name,
            object_name=object_name,
            data=data_stream,
            length=len(data),
            content_type=content_type
        )
        protocol = "https" if settings.MINIO_SECURE else "http"
        return f"{protocol}://{settings.MINIO_ENDPOINT}/{bucket_name}/{object_name}"

    @staticmethod
    def delete_file(bucket_name: str, object_name: str) -> None:
        """Delete an object from MinIO"""
        minio_client.remove_object(bucket_name, object_name)
