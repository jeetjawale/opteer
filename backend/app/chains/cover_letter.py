from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.llm import get_llm

def get_cover_letter_chain():
    """
    Creates and returns a LangChain chain for writing a tailored 3-paragraph cover letter.
    Uses temperature=0.7 to support natural, engaging, and professional writing style.
    Pipes the prompt, LLM, and string parser into a single execution unit.
    """
    # 1. Initialize LLM (temperature=0.7 for creative/persuasive writing) and parser
    llm = get_llm(temperature=0.7)
    parser = StrOutputParser()

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
