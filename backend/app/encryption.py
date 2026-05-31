from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

def _get_fernet() -> Fernet:
    key = settings.API_KEY_ENCRYPTION_KEY
    # The key should be 32 url-safe base64-encoded bytes.
    if not key:
        raise RuntimeError("API_KEY_ENCRYPTION_KEY is not configured.")
    return Fernet(key.encode("utf-8"))

def encrypt_api_key(api_key: str) -> str:
    """Encrypts an API key for storage."""
    if not api_key:
        return ""
    fernet = _get_fernet()
    return fernet.encrypt(api_key.encode("utf-8")).decode("utf-8")

def decrypt_api_key(encrypted_api_key: str) -> str:
    """Decrypts a stored API key."""
    if not encrypted_api_key:
        return ""
    fernet = _get_fernet()
    try:
        return fernet.decrypt(encrypted_api_key.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        raise ValueError("Invalid encryption token or key mismatch. Could not decrypt API key.")
