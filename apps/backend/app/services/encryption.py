import logging
from cryptography.fernet import Fernet, InvalidToken
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class EncryptionService:

    
    def __init__(self):
        self._is_ready = False
        try:
            key_str = settings.encryption_key
            if not key_str or key_str == "your-fernet-key-change-in-production":
                logger.error("ENCRYPTION_KEY is not set or is using the default! Decryption will fail.")
                return
                
            key = key_str.encode()
            self._fernet = Fernet(key)
            self._is_ready = True
        except Exception as e:
            logger.error(f"EncryptionService failed to initialize with provided key: {e}")
    
    def encrypt(self, data: str) -> str:

        if not self._is_ready:
            raise ValueError("Encryption service not initialized. Check ENCRYPTION_KEY.")
        encrypted = self._fernet.encrypt(data.encode())
        return encrypted.decode()
    
    def decrypt(self, encrypted_data: str) -> str:

        if not self._is_ready:
            return "[KEY_MISSING]"
        try:
            decrypted = self._fernet.decrypt(encrypted_data.encode())
            return decrypted.decode()
        except InvalidToken:
            logger.warning("Decryption failed: InvalidToken. The ENCRYPTION_KEY does not match.")
            return "[KEY_MISMATCH]"
        except Exception as e:
            logger.error(f"Unexpected decryption error: {e}")
            return "[ERROR]"



_encryption_service: EncryptionService | None = None


def get_encryption_service() -> EncryptionService:

    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
