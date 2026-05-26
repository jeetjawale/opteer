from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import app.llm
from app.schemas import InterviewPrepResult
from app.config import settings

def get_interview_prep_chain(user_api_key: str | None = None):
    """
    Creates and returns a LangChain chain for generating personalized interview prep questions and answers.
    Uses temperature=0.3 to balance structured analytical insights with natural conversational replies.
    Pipes the prompt, LLM, and JSON parser into a single execution unit.
    """
    # 1. Initialize parser and LLM (temperature=0.3 for structured, balanced questions)
    parser = JsonOutputParser(pydantic_object=InterviewPrepResult)
    llm = app.llm.get_llm(temperature=0.3, max_tokens=4000, model_override=settings.AI_MODEL_PREP, user_api_key=user_api_key)

    # 2. Build Prompt Template with formatting instructions
    prompt = PromptTemplate(
        template="""You are an experienced technical interviewer and hiring manager. Your goal is to prepare a candidate for an upcoming job interview.

Resume Text:
{resume_text}

Job Description:
{scraped_jd}

Instructions:
1. Generate exactly 8 relevant interview questions tailored to the candidate's background and the target job description (JD).
2. The questions should cover a variety of topics, including core technical skills, behavioral alignment, domain-specific scenarios, and potential resume gaps relative to the JD.
3. For each question, provide a detailed "suggested_answer" guiding the candidate on how to structure their response.
4. Each suggested answer MUST explicitly tie back to, and reference, actual achievements, roles, technologies, or projects from the candidate's Resume Text to make it personalized and authentic.
5. Ensure the output strictly conforms to the JSON schema.

{format_instructions}
""",
        input_variables=["resume_text", "scraped_jd"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    # 3. Assemble LCEL chain
    return prompt | llm | parser
