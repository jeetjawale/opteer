from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

import app.ai.llm


def get_rewrite_chain(
    provider_name: str,
    model_name: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
):
    """
    Creates and returns a LangChain chain for rewriting specific text snippets.
    Uses temperature=0.7 to support natural, engaging, and professional writing style.
    """
    parser = StrOutputParser()

    # 1. Initialize LLM (defaults to 0.7 temp for creative writing tasks)
    llm = app.ai.llm.get_llm(
        provider_name=provider_name,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=0.7,
        max_tokens=800,
    )

    # 2. Build Prompt Template
    prompt = PromptTemplate(
        template="""You are a professional resume writer and career coach acting as an AI Co-Pilot for a job applicant.
The user is editing their cover letter and has selected a specific portion of text to rewrite.

Full Cover Letter Context:
{full_context}

Selected Text to Rewrite:
{selected_text}

User Instruction:
{instruction}

Your task is to rewrite ONLY the selected text based on the user's instruction.
CRITICAL INSTRUCTIONS:
- ONLY output the rewritten text.
- DO NOT wrap the output in quotes or markdown code blocks like ```text.
- DO NOT output the full cover letter, just the rewritten snippet.
- Ensure the tone remains professional and fits well within the context of the full cover letter.

Rewritten Text:""",  # noqa: E501
        input_variables=["full_context", "selected_text", "instruction"],
    )

    # 3. Assemble LCEL chain
    return prompt | llm | parser
