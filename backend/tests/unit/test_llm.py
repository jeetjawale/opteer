import pytest
from app.ai.llm import get_llm, sanitize_llm_input

def test_sanitize_llm_input():
    assert sanitize_llm_input("abc") == "abc"
    assert sanitize_llm_input("a" * 20000, max_chars=100) == "a" * 100

def test_get_llm():
    # Since openai uses BaseChatModel, we can mock or just ensure it constructs correctly
    llm = get_llm(provider_name="openai", model_name="gpt-4o-mini", api_key="sk-abcdefghijklmnopqrstuvwxyz")
    assert llm is not None
    
    llm_claude = get_llm(provider_name="anthropic", model_name="claude-3-haiku-20240307", api_key="sk-ant-abcdefghijklmnopqrstuvwxyz")
    assert llm_claude is not None
