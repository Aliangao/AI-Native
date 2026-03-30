"""Multi-model AI router - routes tasks to appropriate models."""
from __future__ import annotations
import os
import httpx
from enum import Enum
from typing import Optional


class ModelTier(Enum):
    LITE = "lite"      # High-frequency, low-cost tasks (summaries, classification)
    PRO = "pro"        # Medium complexity (tool info, general chat)
    STRONG = "strong"  # High-value tasks (business analysis, opportunity matching)


# Model configuration
MODEL_CONFIG = {
    ModelTier.LITE: {
        "provider": "doubao",
        "model": os.getenv("DOUBAO_LITE_MODEL", "doubao-lite-32k"),
        "api_key_env": "DOUBAO_API_KEY",
        "base_url": os.getenv("DOUBAO_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
    },
    ModelTier.PRO: {
        "provider": "doubao",
        "model": os.getenv("DOUBAO_PRO_MODEL", "doubao-pro-32k"),
        "api_key_env": "DOUBAO_API_KEY",
        "base_url": os.getenv("DOUBAO_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
    },
    ModelTier.STRONG: {
        "provider": os.getenv("STRONG_PROVIDER", "doubao"),
        "model": os.getenv("STRONG_MODEL", "doubao-seed-2-0-pro-260215"),
        "api_key_env": os.getenv("STRONG_API_KEY_ENV", "DOUBAO_API_KEY"),
        "base_url": os.getenv("STRONG_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
    },
}

# Task to model tier mapping
TASK_MODEL_MAP = {
    "summarize": ModelTier.LITE,
    "classify": ModelTier.LITE,
    "tool_info": ModelTier.PRO,
    "chat": ModelTier.PRO,
    "intent_detect": ModelTier.PRO,
    "extract_business": ModelTier.STRONG,
    "match_opportunity": ModelTier.STRONG,
}


async def call_llm(
    task: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 2000,
    tier_override: Optional[ModelTier] = None,
) -> str:
    """Call the appropriate LLM based on task type."""
    tier = tier_override or TASK_MODEL_MAP.get(task, ModelTier.PRO)
    config = MODEL_CONFIG[tier]
    api_key = os.getenv(config["api_key_env"], "")

    if config["provider"] == "anthropic":
        return await _call_anthropic(config, api_key, messages, temperature, max_tokens)
    else:
        return await _call_openai_compatible(config, api_key, messages, temperature, max_tokens)


async def _call_openai_compatible(
    config: dict, api_key: str, messages: list[dict],
    temperature: float, max_tokens: int
) -> str:
    """Call OpenAI-compatible API (Doubao, etc.)."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{config['base_url']}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": config["model"],
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _call_anthropic(
    config: dict, api_key: str, messages: list[dict],
    temperature: float, max_tokens: int
) -> str:
    """Call Anthropic Claude API."""
    # Convert from OpenAI format: extract system message
    system = ""
    chat_messages = []
    for msg in messages:
        if msg["role"] == "system":
            system = msg["content"]
        else:
            chat_messages.append(msg)

    async with httpx.AsyncClient(timeout=120) as client:
        body = {
            "model": config["model"],
            "messages": chat_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if system:
            body["system"] = system

        resp = await client.post(
            f"{config['base_url']}/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=body,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
