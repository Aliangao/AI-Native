"""AI tool name detection from user messages."""
from __future__ import annotations
import re

# Pre-curated list of popular AI tools for fast matching
KNOWN_TOOLS = [
    "ChatGPT", "Claude", "Gemini", "Midjourney", "Stable Diffusion", "DALL-E",
    "Cursor", "GitHub Copilot", "Copilot", "V0", "Bolt", "Lovable",
    "Suno", "Udio", "ElevenLabs", "Runway", "Pika", "Kling", "可灵",
    "Notion AI", "Jasper", "Copy.ai", "Writesonic",
    "Perplexity", "You.com", "Phind", "Devv",
    "Devin", "OpenDevin", "SWE-agent",
    "ComfyUI", "WebUI", "Fooocus",
    "Dify", "Coze", "扣子", "FastGPT", "Flowise",
    "HuggingFace", "Replicate", "Together AI",
    "Sora", "Veo", "Luma", "Hailuo", "海螺",
    "Manus", "奇觉", "通义千问", "文心一言", "Kimi", "豆包",
    "Windsurf", "Trae", "Replit Agent",
    "NotebookLM", "Gamma", "Beautiful.ai",
    "Ideogram", "Flux", "Recraft",
    "Napkin AI", "Canva AI", "Adobe Firefly",
]

# Build regex pattern for fast matching
_tool_pattern = re.compile(
    "|".join(re.escape(t) for t in sorted(KNOWN_TOOLS, key=len, reverse=True)),
    re.IGNORECASE,
)


def detect_tool_mention(text: str) -> str | None:
    """Detect if user message mentions an AI tool. Returns tool name or None."""
    match = _tool_pattern.search(text)
    if match:
        # Normalize to canonical name
        matched = match.group()
        for tool in KNOWN_TOOLS:
            if tool.lower() == matched.lower():
                return tool
        return matched
    return None
