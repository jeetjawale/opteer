from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import app.llm
from app.schemas import FitScoreResult
from app.config import settings

def get_fit_scoring_chain(user_api_key: str | None = None):
    """
    Creates and returns a LangChain chain for scoring candidate fit against a job description.
    Uses temperature=0.0 for consistent, objective, and analytical outputs.
    Pipes the prompt, LLM, and JSON parser into a single execution unit.
    """
    # 1. Initialize parser and LLM (temperature=0 for analytical tasks)
    parser = JsonOutputParser(pydantic_object=FitScoreResult)
    llm = app.llm.get_llm(temperature=0.0, max_tokens=1200, model_override=settings.AI_MODEL_FIT, user_api_key=user_api_key)

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
4. Extract matched skills (skills explicitly mentioned or strongly demonstrated in both).
5. Identify missing critical skills or key requirements mentioned in the JD that are not present in the resume.
6. Provide a concise, honest, and professional 2-3 sentence summary explaining the assessment.

{format_instructions}
""",
        input_variables=["resume_text", "scraped_jd"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    # 3. Assemble LCEL chain
    return prompt | llm | parser
