from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import app.ai.llm
from app.schemas import InterviewPrepResult

from app.ai.workflow_config import WORKFLOW_CONFIG


def get_interview_prep_chain(
    provider_name: str,
    model_name: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
):
    """
    Creates and returns a LangChain chain for generating technical interview preparation questions.
    """
    parser = JsonOutputParser(pydantic_object=InterviewPrepResult)
    config = WORKFLOW_CONFIG["interview_prep"]

    # 1. Initialize LLM
    llm = app.ai.llm.get_llm(
        provider_name=provider_name,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=config["temperature"],  # type: ignore[arg-type]
        max_tokens=config["max_tokens"],  # type: ignore[arg-type]
    )

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
6. IMPORTANT: Do not use markdown formatting like **bold** or bullet points with *. Use plain text only.

{format_instructions}
""",
        input_variables=["resume_text", "scraped_jd"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    # 3. Assemble LCEL chain
    return prompt | llm | parser
