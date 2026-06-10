PROVIDER_MODELS = {
    "openai": "gpt-4o",
    "claude_sonnet": "claude-3-5-sonnet-20241022",
    "claude_opus": "claude-3-opus-20240229",
    "gemini_pro": "gemini-3.1-flash-lite",
}

WORKFLOW_CONFIG = {
    "fit_scoring": {
        "preferred_models": ["gemini_pro", "openai"],
        "temperature": 0.1,
        "max_tokens": 1500,
    },
    "resume_tailor": {
        "preferred_models": ["gemini_pro", "openai"],
        "temperature": 0.2,
        "max_tokens": 2500,
    },
    "cover_letter": {
        "preferred_models": ["gemini_pro", "openai"],
        "temperature": 0.5,
        "max_tokens": 1500,
    },
    "interview_prep": {
        "preferred_models": ["gemini_pro", "openai"],
        "temperature": 0.3,
        "max_tokens": 2000,
    },
}
