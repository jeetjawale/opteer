from abc import ABC, abstractmethod

class StorageProvider(ABC):
    @abstractmethod
    async def upload(self, bucket: str, path: str, file_data: bytes, content_type: str) -> str:
        """Uploads a file and returns its public URL"""
        pass
    
    @abstractmethod
    async def get_public_url(self, bucket: str, path: str) -> str:
        """Returns the public URL for a given file path"""
        pass
    
    @abstractmethod
    async def delete(self, bucket: str, path: str) -> None:
        """Deletes a file"""
        pass
