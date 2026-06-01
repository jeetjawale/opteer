def sanitize_error(error: str, api_key: str | None) -> str:
    """
    Strips the API key pattern from error messages to prevent credential leaks.
    """
    if api_key and len(api_key) > 8:
        return error.replace(api_key, "[REDACTED]")
    return error
