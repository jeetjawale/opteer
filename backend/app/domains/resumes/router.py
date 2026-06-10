from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File, Query
from uuid import UUID

from app.database import get_current_user
from app.schemas import ResumeResponse, ResumeCreate, ResumeUpdate, ResumePaginatedResponse
from app.utils.timing import log_duration
from app.core.dependencies import get_resume_service
from app.domains.resumes.service import ResumeService

router = APIRouter(prefix="/resumes", tags=["resumes"])

@router.get("", response_model=ResumePaginatedResponse)
async def list_resumes(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user = Depends(get_current_user),
    service: ResumeService = Depends(get_resume_service)
):
    """
    List all resumes for the authenticated user with pagination.
    """
    async with log_duration("LIST_RESUMES"):
        try:
            return await service.list_resumes(str(current_user.id), page=page, per_page=per_page)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list resumes: {str(e)}"
            )

@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(
    payload: ResumeCreate,
    current_user = Depends(get_current_user),
    service: ResumeService = Depends(get_resume_service)
):
    """
    Creates a new resume for the authenticated user.
    """
    async with log_duration("CREATE_RESUME"):
        try:
            resume_data = payload.model_dump()
            return await service.create_resume(str(current_user.id), resume_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create resume: {str(e)}"
            )

@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    service: ResumeService = Depends(get_resume_service)
):
    """
    Uploads a resume file (PDF/DOCX), extracts its text, and saves it.
    """
    async with log_duration("UPLOAD_RESUME"):
        try:
            allowed_types = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ]
            filename = file.filename or ""
            content_type = file.content_type or ""
            if content_type not in allowed_types and not filename.endswith(('.pdf', '.docx', '.txt')):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid file type. Only PDF, DOCX, and TXT are allowed."
                )

            return await service.upload_resume_file(str(current_user.id), file)
        except ValueError as ve:
            message = str(ve)
            if "too large" in message.lower():
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=message)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload resume: {str(e)}"
            )

@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: UUID,
    current_user = Depends(get_current_user),
    service: ResumeService = Depends(get_resume_service)
):
    """
    Retrieves full details for a single resume.
    """
    async with log_duration("GET_RESUME"):
        resume = await service.get_resume(str(current_user.id), str(resume_id))
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        return resume

@router.patch("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: UUID,
    payload: ResumeUpdate,
    current_user = Depends(get_current_user),
    service: ResumeService = Depends(get_resume_service)
):
    """
    Updates the name or content of a resume.
    """
    async with log_duration("UPDATE_RESUME"):
        resume = await service.get_resume(str(current_user.id), str(resume_id))
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )

        update_data = payload.model_dump(exclude_unset=True)
        update_data.pop("id", None)
        update_data.pop("user_id", None)

        return await service.update_resume(str(current_user.id), str(resume_id), update_data)

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: UUID,
    current_user = Depends(get_current_user),
    service: ResumeService = Depends(get_resume_service)
):
    """
    Deletes the resume.
    """
    async with log_duration("DELETE_RESUME"):
        resume = await service.get_resume(str(current_user.id), str(resume_id))
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )

        await service.delete_resume(str(current_user.id), str(resume_id))
        return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/{resume_id}/file", response_model=ResumeResponse)
async def delete_resume_file(
    resume_id: UUID,
    current_user = Depends(get_current_user),
    service: ResumeService = Depends(get_resume_service)
):
    """
    Removes the file content from a resume record.
    """
    async with log_duration("DELETE_RESUME_FILE"):
        resume = await service.get_resume(str(current_user.id), str(resume_id))
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )

        return await service.delete_resume_file(str(current_user.id), str(resume_id))
