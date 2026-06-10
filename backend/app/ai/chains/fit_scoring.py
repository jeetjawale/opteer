from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import app.ai.llm
from app.schemas import FitScoreResult
from app.core.config import settings

from app.ai.workflow_config import WORKFLOW_CONFIG

def get_fit_scoring_chain(provider_name: str, model_name: str | None = None, api_key: str | None = None, base_url: str | None = None):
    """
    Creates and returns a LangChain chain for calculating the job fit score.
    """
    parser = JsonOutputParser(pydantic_object=FitScoreResult)
    config = WORKFLOW_CONFIG["fit_scoring"]
    
    llm = app.ai.llm.get_llm(
        provider_name=provider_name,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=config["temperature"],
        max_tokens=config["max_tokens"]
    )

    # 2. Build Prompt Template with formatting instructions
    prompt = PromptTemplate(
        template="""You are an expert, objective technical recruiter. Your task is to analyze the candidate's resume and determine how well they fit the provided job description (JD).

Resume Text:
{resume_text}

Job Description:
{scraped_jd}

Instructions:
1. Review the JD to identify primary requirements, core technical skills, and responsibilities.
2. Review the Candidate's Resume to find matching experiences, tools, and skills.
3. Determine a realistic fit score between 0 and 100 based on how closely the candidate's resume matches the JD requirements.
4. Extract matched skills (ONLY extract technical skills or keywords that are EXPLICITLY mentioned by name in the Job Description AND are also present in the candidate's resume. Do not infer underlying tools).
5. Identify missing critical skills or key requirements mentioned in the JD that are not present in the resume.
6. Provide an explicitly detailed, explainable Markdown summary explaining exactly *why* the candidate matched or didn't match. Highlight the strongest alignments and the biggest gaps.

{format_instructions}
""",
        input_variables=["resume_text", "scraped_jd"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    # 3. Assemble LCEL chain
    return prompt | llm | parser
