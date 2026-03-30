"""Web search fallback for unknown AI tools."""
import json
from app.ai.router import call_llm
from app.ai.prompts import TOOL_ANALYZE


async def search_and_analyze_tool(tool_name: str) -> dict:
    """Use LLM to generate tool information when not in knowledge base."""
    prompt = TOOL_ANALYZE.format(tool_name=tool_name)
    try:
        result = await call_llm(
            task="tool_info",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        return json.loads(result)
    except Exception as e:
        return {
            "name": tool_name,
            "description": f"关于 {tool_name} 的信息正在获取中",
            "category": "未知",
            "features": [],
            "getting_started": "请访问官网了解更多",
            "getting_started_url": "",
            "similar_tools": [],
            "verdict": "需要进一步了解",
        }
