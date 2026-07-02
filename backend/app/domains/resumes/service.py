import io
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import docx
import pypdf
from fastapi import UploadFile
from sqlalchemy import func, select

from app.db.models.resume import Resume
from app.db.repositories.resume import ResumeRepository
from app.infrastructure.storage.base import StorageProvider

MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_RESUME_EXTENSIONS = (".pdf", ".docx", ".txt")


class ResumeService:
    def __init__(self, resume_repo: ResumeRepository, storage: StorageProvider):
        self.resume_repo = resume_repo
        self.storage = storage

    def _model_to_dict(self, resume: Resume) -> dict:
        content = resume.content or ""
        preview = content[:100] + ("..." if len(content) > 100 else "")
        return {
            "id": str(resume.id),
            "user_id": str(resume.user_id),
            "name": resume.name,
            "content": resume.content,
            "preview": preview,
            "file_url": resume.file_url,
            "file_name": resume.file_name,
            "created_at": resume.created_at.isoformat() if resume.created_at else None,
            "updated_at": resume.updated_at.isoformat() if resume.updated_at else None,
        }

    async def list_resumes(
        self, user_id: str | uuid.UUID, page: int = 1, per_page: int = 50
    ) -> Dict[str, Any]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)

        offset = (page - 1) * per_page

        # Get total count
        count_query = select(func.count()).where(Resume.user_id == user_id)
        count_result = await self.resume_repo.session.execute(count_query)
        total_count = count_result.scalar() or 0

        # Get paginated data
        query = (
            select(Resume)
            .where(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        result = await self.resume_repo.session.execute(query)
        records = result.scalars().all()

        resumes_list = [self._model_to_dict(r) for r in records]

        return {
            "items": resumes_list,
            "total": total_count,
            "page": page,
            "per_page": per_page,
        }

    def _validate_resume_upload(self, file_name: str, contents: bytes) -> None:
        if not file_name:
            raise ValueError("Filename is required")
        if len(contents) > MAX_RESUME_SIZE_BYTES:
            raise ValueError("File too large. Maximum size is 5MB.")
        lowered = file_name.lower()
        if not lowered.endswith(ALLOWED_RESUME_EXTENSIONS):
            raise ValueError("Invalid file type. Only PDF, DOCX, and TXT are allowed.")

    def _extract_text_from_bytes(self, file_name: str, contents: bytes) -> str:
        lowered = file_name.lower()
        try:
            if lowered.endswith(".pdf"):
                pdf_reader = pypdf.PdfReader(io.BytesIO(contents))
                text_parts = []
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                return "\n".join(text_parts).strip()
            if lowered.endswith(".docx"):
                doc = docx.Document(io.BytesIO(contents))
                text_parts = [para.text for para in doc.paragraphs if para.text]
                return "\n".join(text_parts).strip()
            return contents.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from file: {str(e)}")

    async def extract_text_from_file(self, file: UploadFile) -> str:
        contents = await file.read()
        await file.seek(0)
        return self._extract_text_from_bytes(file.filename or "", contents)

    async def upload_resume_file(
        self, user_id: str | uuid.UUID, file: UploadFile
    ) -> Dict[str, Any]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)

        file_name = file.filename or ""
        if not file_name:
            raise ValueError("Filename is required")

        contents = await file.read()
        await file.seek(0)
        self._validate_resume_upload(file_name, contents)

        text = self._extract_text_from_bytes(file_name, contents)
        if not text:
            raise ValueError("Could not extract any text from the file")

        file_uuid = str(uuid.uuid4())
        safe_filename = Path(file_name).name.replace(" ", "_")
        storage_path = f"{user_id}/{file_uuid}-{safe_filename}"

        file_url = await self.storage.upload(
            bucket="resumes",
            path=storage_path,
            file_data=contents,
            content_type=file.content_type or "application/octet-stream",
        )

        try:
            resume = await self.resume_repo.create(
                user_id=user_id,
                name=file_name,
                content=text,
                file_name=file_name,
                file_url=file_url,
            )
        except Exception:
            await self.storage.delete(bucket="resumes", path=storage_path)
            raise ValueError("Database insertion failed.")

        return self._model_to_dict(resume)

    async def create_resume(
        self, user_id: str | uuid.UUID, payload_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)

        resume = await self.resume_repo.create(user_id=user_id, **payload_data)
        return self._model_to_dict(resume)

    async def get_resume(
        self, user_id: str | uuid.UUID, resume_id: str | uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(resume_id, str):
            resume_id = uuid.UUID(resume_id)

        resume = await self.resume_repo.get(resume_id)
        if not resume or resume.user_id != user_id:
            return None

        return self._model_to_dict(resume)

    async def update_resume(
        self,
        user_id: str | uuid.UUID,
        resume_id: str | uuid.UUID,
        update_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(resume_id, str):
            resume_id = uuid.UUID(resume_id)

        resume = await self.resume_repo.get(resume_id)
        if not resume or resume.user_id != user_id:
            return None

        updated = await self.resume_repo.update(resume, **update_data)
        return self._model_to_dict(updated)

    async def delete_resume(
        self, user_id: str | uuid.UUID, resume_id: str | uuid.UUID
    ) -> None:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(resume_id, str):
            resume_id = uuid.UUID(resume_id)

        resume = await self.resume_repo.get(resume_id)
        if not resume or resume.user_id != user_id:
            return

        if resume.file_url:
            if not resume.file_url.startswith("http"):
                await self.storage.delete(bucket="resumes", path=resume.file_url)
            else:
                from app.core.config import settings

                if resume.file_url.startswith(
                    f"{settings.API_URL}/api/storage/resumes/"
                ):
                    path = resume.file_url.replace(
                        f"{settings.API_URL}/api/storage/resumes/", ""
                    )
                    await self.storage.delete(bucket="resumes", path=path)

        await self.resume_repo.delete(resume_id)

    async def delete_resume_file(
        self, user_id: str | uuid.UUID, resume_id: str | uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        if isinstance(resume_id, str):
            resume_id = uuid.UUID(resume_id)

        resume = await self.resume_repo.get(resume_id)
        if not resume or resume.user_id != user_id:
            return None

        if resume.file_url:
            if not resume.file_url.startswith("http"):
                await self.storage.delete(bucket="resumes", path=resume.file_url)
            else:
                from app.core.config import settings

                if resume.file_url.startswith(
                    f"{settings.API_URL}/api/storage/resumes/"
                ):
                    path = resume.file_url.replace(
                        f"{settings.API_URL}/api/storage/resumes/", ""
                    )
                    await self.storage.delete(bucket="resumes", path=path)

        updated = await self.resume_repo.update(resume, file_url=None, file_name=None)
        return self._model_to_dict(updated)
