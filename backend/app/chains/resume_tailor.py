from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import app.llm
from app.schemas import ResumeEditsResult
from app.config import settings

def get_resume_tailoring_chain(user_api_key: str | None = None, model_override: str | None = None):
    """
    Creates and returns a LangChain chain for generating tailored resume edits.
    Outputs actionable suggestions for adding, removing, or modifying resume content.
    """
    parser = JsonOutputParser(pydantic_object=ResumeEditsResult)
    llm = app.llm.get_llm(temperature=0.4, max_tokens=2000, model_override=model_override or settings.AI_MODEL_FIT, user_api_key=user_api_key)

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
