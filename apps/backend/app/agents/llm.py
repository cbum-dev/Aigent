

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import get_settings


def get_llm(
    temperature: float = 0.0,
    model: str = "gemini-flash-lite-latest",
    api_key: str | None = None,
) -> ChatGoogleGenerativeAI:

    settings = get_settings()


    final_api_key = api_key or settings.gemini_api_key or settings.google_api_key

    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=final_api_key,
        temperature=temperature,
        convert_system_message_to_human=True,
    )
