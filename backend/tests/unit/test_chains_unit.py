import pytest
from unittest.mock import patch
from langchain_core.language_models.chat_models import SimpleChatModel

from app.chains.fit_scoring import get_fit_scoring_chain
from app.chains.cover_letter import get_cover_letter_chain
from app.chains.interview_prep import get_interview_prep_chain

class MockLLM(SimpleChatModel):
    mock_response: str = ""

    def _call(self, messages, stop=None, run_manager=None, **kwargs):
        return self.mock_response

    async def _acall(self, messages, stop=None, run_manager=None, **kwargs):
        return self.mock_response

    @property
    def _llm_type(self) -> str:
        return "mock"

@pytest.mark.asyncio
async def test_fit_scoring_chain():
    mock_content = '{"fit_score": 88, "matched_skills": ["Python", "React"], "missing_skills": ["Docker"], "key_requirements": ["Python development", "Docker orchestration"], "summary": "Strong core developer fit with some minor infrastructure gaps."}'
    mock_llm = MockLLM(mock_response=mock_content)
    
    with patch("app.llm.get_llm", return_value=mock_llm) as mock_get_llm:
        chain = get_fit_scoring_chain()
        result = await chain.ainvoke({
            "resume_text": "Experienced Python and React developer.",
            "scraped_jd": "We need a Python developer who knows Docker."
        })
        
        assert result["fit_score"] == 88
        assert "Python" in result["matched_skills"]
        assert "Docker" in result["missing_skills"]
        assert "Docker orchestration" in result["key_requirements"]
        assert "Strong core developer fit" in result["summary"]
        mock_get_llm.assert_called_once()

@pytest.mark.asyncio
async def test_cover_letter_chain():
    mock_content = "Dear Hiring Manager,\n\nI am thrilled to apply for the Developer role. AutoFlow's emphasis on automation aligns with my values.\n\nI bring 3 years of React and Python experience.\n\nSincerely,\nJohn Doe"
    mock_llm = MockLLM(mock_response=mock_content)
    
    with patch("app.llm.get_llm", return_value=mock_llm) as mock_get_llm:
        chain = get_cover_letter_chain()
        result = await chain.ainvoke({
            "resume_text": "John Doe - Python and React Developer.",
            "scraped_jd": "Full Stack developer wanted.",
            "company_research": "AutoFlow specializes in backend systems."
        })
        
        assert "Dear Hiring Manager," in result
        assert "AutoFlow's emphasis on automation" in result
        assert "John Doe" in result
        mock_get_llm.assert_called_once()

@pytest.mark.asyncio
async def test_interview_prep_chain():
    mock_content = '{"questions": [{"question": "How do you handle asynchronous operations in Python?", "suggested_answer": "I use asyncio and async/await syntax, as I did in my messaging app project."}]}'
    mock_llm = MockLLM(mock_response=mock_content)
    
    with patch("app.llm.get_llm", return_value=mock_llm) as mock_get_llm:
        chain = get_interview_prep_chain()
        result = await chain.ainvoke({
            "resume_text": "Built a messaging app in python using asyncio.",
            "scraped_jd": "Needs to write highly performant asynchronous python code."
        })
        
        assert len(result["questions"]) == 1
        assert "asynchronous operations" in result["questions"][0]["question"]
        assert "asyncio" in result["questions"][0]["suggested_answer"]
        mock_get_llm.assert_called_once()
