from cryptography.fernet import Fernet
from app.config import get_settings

settings = get_settings()


class EncryptionService:
    """Service for encrypting/decrypting sensitive data like database credentials."""
    
    def __init__(self):
        # In production, use a proper Fernet key from settings
        # Generate with: Fernet.generate_key()
        key = settings.encryption_key
        if key == "your-fernet-key-change-in-production":
            # Generate a temporary key for development
            key = Fernet.generate_key()
        elif isinstance(key, str):
            key = key.encode()
        
        self._fernet = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string and return base64-encoded ciphertext."""
        encrypted = self._fernet.encrypt(data.encode())
        return encrypted.decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt base64-encoded ciphertext and return plaintext."""
        decrypted = self._fernet.decrypt(encrypted_data.encode())
        return decrypted.decode()


# Singleton instance
_encryption_service: EncryptionService | None = None


def get_encryption_service() -> EncryptionService:
    """Get the encryption service singleton."""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
