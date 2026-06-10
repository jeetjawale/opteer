from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import app.ai.llm
from app.schemas import ResumeEditsResult

from app.ai.workflow_config import WORKFLOW_CONFIG


def get_resume_tailoring_chain(
    provider_name: str,
    model_name: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
):
    """
    Creates and returns a LangChain chain for suggesting resume edits to better match a job description.
    """
    parser = JsonOutputParser(pydantic_object=ResumeEditsResult)
    config = WORKFLOW_CONFIG["resume_tailor"]

    # 1. Initialize LLM
    llm = app.ai.llm.get_llm(
        provider_name=provider_name,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=config["temperature"],
        max_tokens=config["max_tokens"],
    )

    prompt = PromptTemplate(
        template="""You are an expert tech recruiter and resume writer. 
Your task is to analyze the candidate's resume and compare it to the Job Description.
Provide specific, actionable edits the candidate should make to their resume to drastically increase their chances of getting an interview.

Resume Text:
{resume_text}

Job Description:
{scraped_jd}

Instructions:
1. Identify critical keywords, tools, or skills mentioned in the JD that are missing from the resume, but the candidate might possess. Suggest adding them.
2. Identify sections that should be rephrased to better match the terminology used in the JD.
3. Identify irrelevant information that can be removed to make space for more impactful points.
4. For each suggestion, provide the section of the resume (e.g., 'Summary', 'Experience', 'Skills'), the actionable suggestion, the reasoning, and the type of edit ('add', 'remove', or 'modify').
5. Keep the suggestions highly specific. Do not say "add more detail". Say "Add a bullet point about AWS Lambda to your Backend Engineer experience."

{format_instructions}
""",
        input_variables=["resume_text", "scraped_jd"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    return prompt | llm | parser
