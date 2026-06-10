import pytest
import uuid
from unittest.mock import MagicMock, AsyncMock
from app.domains.jobs.service import JobService
from app.schemas import JobCreate, JobUpdate

@pytest.fixture
def mock_job_repo():
    return AsyncMock()

@pytest.fixture
def mock_app_repo():
    return AsyncMock()

@pytest.fixture
def mock_user_repo():
    return AsyncMock()

@pytest.fixture
def mock_user_configs_repo():
    return AsyncMock()

@pytest.fixture
def job_service(mock_job_repo, mock_app_repo, mock_user_repo, mock_user_configs_repo):
    return JobService(
        job_repo=mock_job_repo,
        app_repo=mock_app_repo,
        user_repo=mock_user_repo,
        user_configs_repo=mock_user_configs_repo
    )

@pytest.mark.asyncio
async def test_create_job(job_service, mock_job_repo):
    mock_job = MagicMock()
    mock_job.id = uuid.uuid4()
    mock_job.url = "https://test.com"
    mock_job.company = "Test Corp"
    mock_job.role = "Engineer"
    mock_job.location = None
    mock_job.work_model = None
    mock_job.company_research = None
    mock_job.scraped_jd = None
    mock_job.created_at = None
    mock_job.updated_at = None
    
    mock_job_repo.create.return_value = mock_job
    
    payload = JobCreate(url="https://test.com", company="Test Corp", role="Engineer")
    result = await job_service.create_job(payload)
    
    assert result["company"] == "Test Corp"
    mock_job_repo.create.assert_called_once()

@pytest.mark.asyncio
async def test_get_jobs(job_service, mock_job_repo):
    mock_job1 = MagicMock()
    mock_job1.id = uuid.uuid4()
    mock_job1.company = "A"
    mock_job1.role = "Dev"
    mock_job1.location = None
    mock_job1.work_model = None
    mock_job1.url = None
    mock_job1.company_research = None
    mock_job1.scraped_jd = None
    mock_job1.created_at = None
    mock_job1.updated_at = None

    mock_job2 = MagicMock()
    mock_job2.id = uuid.uuid4()
    mock_job2.company = "B"
    mock_job2.role = "PM"
    mock_job2.location = None
    mock_job2.work_model = None
    mock_job2.url = None
    mock_job2.company_research = None
    mock_job2.scraped_jd = None
    mock_job2.created_at = None
    mock_job2.updated_at = None
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_job1, mock_job2]
    mock_job_repo.session.execute.return_value = mock_result
    
    results = await job_service.get_jobs()
    assert len(results) == 2
    mock_job_repo.session.execute.assert_called_once()

@pytest.mark.asyncio
async def test_get_job(job_service, mock_job_repo):
    job_id = uuid.uuid4()
    mock_job = MagicMock()
    mock_job.id = job_id
    mock_job.company = "A"
    mock_job.role = None
    mock_job.location = None
    mock_job.work_model = None
    mock_job.url = None
    mock_job.company_research = None
    mock_job.scraped_jd = None
    mock_job.created_at = None
    mock_job.updated_at = None
    
    mock_job_repo.get.return_value = mock_job
    
    result = await job_service.get_job(job_id)
    assert result["id"] == str(job_id)
    mock_job_repo.get.assert_called_once_with(job_id)

@pytest.mark.asyncio
async def test_update_job(job_service, mock_job_repo):
    job_id = uuid.uuid4()
    mock_job = MagicMock()
    mock_job.id = job_id
    mock_job.company = "A"
    mock_job.role = None
    mock_job.location = None
    mock_job.work_model = None
    mock_job.url = None
    mock_job.company_research = None
    mock_job.scraped_jd = None
    mock_job.created_at = None
    mock_job.updated_at = None
    
    mock_updated = MagicMock()
    mock_updated.id = job_id
    mock_updated.company = "New Corp"
    mock_updated.role = None
    mock_updated.location = None
    mock_updated.work_model = None
    mock_updated.url = None
    mock_updated.company_research = None
    mock_updated.scraped_jd = None
    mock_updated.created_at = None
    mock_updated.updated_at = None

    mock_job_repo.get.return_value = mock_job
    mock_job_repo.update.return_value = mock_updated
    
    payload = JobUpdate(company="New Corp")
    result = await job_service.update_job(job_id, payload)
    
    assert result["company"] == "New Corp"
    mock_job_repo.update.assert_called_once()

@pytest.mark.asyncio
async def test_delete_job(job_service, mock_job_repo):
    job_id = uuid.uuid4()
    
    await job_service.delete_job(job_id)
    mock_job_repo.delete.assert_called_once_with(job_id)
