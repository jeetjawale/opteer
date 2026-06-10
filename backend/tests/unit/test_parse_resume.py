import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from app.main import app
from app.database import get_current_user

client = TestClient(app)

class MockUser:
    id = "11111111-1111-1111-1111-111111111111"
    email = "test@opteer.com"

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    yield
    app.dependency_overrides.clear()

def test_parse_txt_resume():
    file_content = b"John Doe resume content in plain text"
    response = client.post(
        "/jobs/parse-resume",
        files={"file": ("resume.txt", file_content, "text/plain")}
    )
    assert response.status_code == 200
    assert response.json()["text"] == "John Doe resume content in plain text"

def test_parse_latex_resume():
    file_content = b"\\documentclass{article}\n\\begin{document}\nJohn Doe latex\n\\end{document}"
    response = client.post(
        "/jobs/parse-resume",
        files={"file": ("resume.tex", file_content, "text/x-tex")}
    )
    assert response.status_code == 200
    assert "John Doe latex" in response.json()["text"]

def test_parse_pdf_resume():
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Parsed PDF text"
    
    mock_reader = MagicMock()
    mock_reader.pages = [mock_page]
    
    with patch("pypdf.PdfReader", return_value=mock_reader) as mock_pdf_reader:
        response = client.post(
            "/jobs/parse-resume",
            files={"file": ("resume.pdf", b"%PDF-1.4 mock binary", "application/pdf")}
        )
        assert response.status_code == 200
        assert response.json()["text"] == "Parsed PDF text"
        mock_pdf_reader.assert_called_once()

def test_parse_docx_resume():
    mock_para1 = MagicMock()
    mock_para1.text = "Paragraph 1 text"
    mock_para2 = MagicMock()
    mock_para2.text = "Paragraph 2 text"
    
    mock_doc = MagicMock()
    mock_doc.paragraphs = [mock_para1, mock_para2]
    
    with patch("docx.Document", return_value=mock_doc) as mock_docx_doc:
        response = client.post(
            "/jobs/parse-resume",
            files={"file": ("resume.docx", b"mock docx binary", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
        assert response.status_code == 200
        assert response.json()["text"] == "Paragraph 1 text\nParagraph 2 text"
        mock_docx_doc.assert_called_once()

def test_parse_unsupported_format():
    response = client.post(
        "/jobs/parse-resume",
        files={"file": ("resume.png", b"mock image content", "image/png")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_parse_resume_rejects_large_file():
    # 5MB + 1 byte
    large_content = b"a" * (5 * 1024 * 1024 + 1)
    
    response = client.post(
        "/jobs/parse-resume",
        files={"file": ("large_resume.txt", large_content, "text/plain")}
    )
    
    assert response.status_code == 413
    assert "File too large" in response.json()["detail"]
