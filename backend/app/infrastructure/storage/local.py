import os
import asyncio
from app.infrastructure.storage.base import StorageProvider
from app.core.config import settings


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = "local_storage"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def _write_file(self, file_path: str, file_data: bytes):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(file_data)

    async def upload(
        self, bucket: str, path: str, file_data: bytes, content_type: str
    ) -> str:
        bucket_dir = os.path.join(self.base_dir, bucket)
        file_path = os.path.join(bucket_dir, path)

        await asyncio.to_thread(self._write_file, file_path, file_data)

        return f"{settings.API_URL}/api/storage/{bucket}/{path}"

    async def get_public_url(self, bucket: str, path: str) -> str:
        return f"{settings.API_URL}/api/storage/{bucket}/{path}"

    async def delete(self, bucket: str, path: str) -> None:
        file_path = os.path.join(self.base_dir, bucket, path)
        if os.path.exists(file_path):
            await asyncio.to_thread(os.remove, file_path)
