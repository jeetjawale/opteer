from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import app.ai.llm
from app.core.config import settings
from app.ai.workflow_config import WORKFLOW_CONFIG

def get_cover_letter_chain(provider_name: str, model_name: str | None = None, api_key: str | None = None, base_url: str | None = None):
    """
    Creates and returns a LangChain chain for writing a tailored 3-paragraph cover letter.
    Uses temperature=0.7 to support natural, engaging, and professional writing style.
    Pipes the prompt, LLM, and string parser into a single execution unit.
    """
    parser = StrOutputParser()
    config = WORKFLOW_CONFIG["cover_letter"]
    
    # 1. Initialize LLM
    llm = app.ai.llm.get_llm(
        provider_name=provider_name,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=config["temperature"],
        max_tokens=config["max_tokens"]
    )

    # 2. Build Prompt Template
    prompt = PromptTemplate(
        template="""You are a professional resume writer and career coach. Your task is to write a highly tailored, compelling 3-paragraph cover letter.

Resume Text:
{resume_text}

Job Description:
{scraped_jd}

Company Research Context:
{company_research}

Instructions:
1. Start the letter directly with the greeting: "Dear Hiring Manager,". Do NOT include any placeholder contact information, dates, addresses, headers, or subject lines.
2. The letter must consist of exactly three paragraphs:
   - Paragraph 1: State the candidate's enthusiasm for the role and company, referencing the company research context naturally (e.g. recent product launches, missions, public statements, or culture) to show genuine interest and connection.
   - Paragraph 2: Showcase the candidate's core strengths, experiences, and technical achievements from their Resume that align directly with key requirements in the Job Description.
   - Paragraph 3: Reiterate excitement for the role, propose next steps (e.g. looking forward to discussing in an interview), and conclude professionally.
3. Finish the letter with a formal sign-off (e.g. "Sincerely,", followed by "Candidate" or the candidate's name if evident in the resume).

Write the cover letter now:
""",
        input_variables=["resume_text", "scraped_jd", "company_research"],
    )

    # 3. Assemble LCEL chain
    return prompt | llm | parser
