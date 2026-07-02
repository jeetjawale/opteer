from typing import List, Optional

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

import app.ai.llm
from app.ai.workflow_config import WORKFLOW_CONFIG

# ── Output Schema ──────────────────────────────────────────────────────────────


class ContactInfo(BaseModel):
    name: str = Field(description="Full name of the candidate")
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    links: List[str] = Field(
        default_factory=list, description="LinkedIn, GitHub, portfolio URLs"
    )


class ExperienceEntry(BaseModel):
    role: str = Field(description="Job title / role name")
    company: str = Field(description="Company or organization name")
    location: Optional[str] = Field(default=None)
    start_date: Optional[str] = Field(default=None)
    end_date: Optional[str] = Field(default=None, description="End date or 'Present'")
    bullets: List[str] = Field(
        default_factory=list, description="Achievement bullet points"
    )


class EducationEntry(BaseModel):
    degree: str = Field(
        description="Degree and major e.g. B.Tech in Computer Engineering"
    )
    institution: str
    location: Optional[str] = Field(default=None)
    start_date: Optional[str] = Field(default=None)
    end_date: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(
        default=None, description="GPA, honors, relevant coursework"
    )


class ProjectEntry(BaseModel):
    name: str
    tech_stack: Optional[str] = Field(
        default=None, description="Comma-separated technologies"
    )
    start_date: Optional[str] = Field(default=None)
    end_date: Optional[str] = Field(default=None)
    bullets: List[str] = Field(default_factory=list)


class SkillCategory(BaseModel):
    category: str = Field(description="Category name e.g. Languages, Frameworks, Tools")
    items: List[str] = Field(description="List of skills in this category")


class CertificationEntry(BaseModel):
    name: str
    issuer: Optional[str] = Field(default=None)
    date: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)


class ResumeStructured(BaseModel):
    contact: ContactInfo
    summary: Optional[str] = Field(default=None)
    experience: List[ExperienceEntry] = Field(default_factory=list)
    education: List[EducationEntry] = Field(default_factory=list)
    projects: List[ProjectEntry] = Field(default_factory=list)
    skills: List[SkillCategory] = Field(default_factory=list)
    certifications: List[CertificationEntry] = Field(default_factory=list)


# ── Chain factory ──────────────────────────────────────────────────────────────


def get_resume_parser_chain(
    provider_name: str,
    model_name: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
):
    """
    Creates and returns a LangChain chain that parses raw plain-text resume
    content into a structured ResumeStructured JSON object.
    """
    parser = JsonOutputParser(pydantic_object=ResumeStructured)

    # Use the default model config; resume parsing is lightweight
    config = WORKFLOW_CONFIG.get(
        "fit_scoring", {"temperature": 0.0, "max_tokens": 4000}
    )

    llm = app.ai.llm.get_llm(
        provider_name=provider_name,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=config["temperature"],  # type: ignore[arg-type]
        max_tokens=config["max_tokens"],  # type: ignore[arg-type]
    )

    prompt = PromptTemplate(
        template="""You are an expert resume parser and writer. Extract ALL information from the raw resume text below into a structured JSON format.

{tailoring_instructions}

RULES:
- Extract EVERY piece of information present; do NOT omit or summarize bullet points unless explicitly instructed by the tailoring instructions.
- Keep bullet points verbatim from the resume text, EXCEPT where tailoring instructions tell you to add, modify, or remove them.
- For dates, preserve the original format (e.g. "Jun 2025", "2021 – 2025", "Present").
- Separate skills into logical categories (Languages, Frameworks, Tools, Databases, Cloud, etc.).
- If the text contains a summary/objective, extract it. If tailoring instructions suggest changing the summary, apply those changes.
- If a section is not present, return an empty list/null for that field.

Raw Resume Text:
{resume_text}

{format_instructions}
""",  # noqa: E501
        input_variables=["resume_text", "tailoring_instructions"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    return prompt | llm | parser
