"""
LLM factory — single place to create Gemini model instances.

Uses `langchain-google-genai` and picks up LangSmith tracing
automatically from the env vars set in main.py.
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import get_settings


def get_llm(
    temperature: float = 0.0,
    model: str = "gemini-2.0-flash",
) -> ChatGoogleGenerativeAI:
    """
    Return a ChatGoogleGenerativeAI instance.

    LangSmith tracing is enabled globally via env vars, so every call
    made through this model is automatically traced.
    """
    settings = get_settings()

    api_key = settings.gemini_api_key or settings.google_api_key

    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key,
        temperature=temperature,
        convert_system_message_to_human=True,
    )
