import json
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ToolInfo, ToolSearchHistory

router = APIRouter()


# ---- Tool Search History ---- #

class ToolHistoryInput(BaseModel):
    user_id: str
    tool_name: str
    tool_data: Optional[dict] = None


@router.get("/history/{user_id}")
async def get_tool_history(user_id: str, db: Session = Depends(get_db)):
    """Get tool search history for a user, most recent first."""
    records = (
        db.query(ToolSearchHistory)
        .filter(ToolSearchHistory.user_id == user_id)
        .order_by(ToolSearchHistory.searched_at.desc())
        .limit(20)
        .all()
    )
    results = []
    for r in records:
        data = None
        if r.tool_data:
            try:
                data = json.loads(r.tool_data)
            except Exception:
                pass
        results.append({
            "id": r.id,
            "tool_name": r.tool_name,
            "tool_data": data,
            "searched_at": r.searched_at.isoformat() if r.searched_at else None,
        })
    return results


@router.post("/history")
async def save_tool_history(input: ToolHistoryInput, db: Session = Depends(get_db)):
    """Save or update a tool search history entry (upsert by user_id + tool_name)."""
    existing = (
        db.query(ToolSearchHistory)
        .filter(ToolSearchHistory.user_id == input.user_id,
                ToolSearchHistory.tool_name.ilike(input.tool_name))
        .first()
    )
    data_str = json.dumps(input.tool_data, ensure_ascii=False) if input.tool_data else None
    if existing:
        existing.tool_data = data_str
        existing.searched_at = datetime.utcnow()
        db.commit()
        return {"message": "updated", "id": existing.id}
    else:
        record = ToolSearchHistory(
            user_id=input.user_id,
            tool_name=input.tool_name,
            tool_data=data_str,
            searched_at=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {"message": "created", "id": record.id}


@router.delete("/history/{user_id}/{tool_name}")
async def delete_tool_history(user_id: str, tool_name: str, db: Session = Depends(get_db)):
    """Delete a tool search history entry."""
    record = (
        db.query(ToolSearchHistory)
        .filter(ToolSearchHistory.user_id == user_id,
                ToolSearchHistory.tool_name.ilike(tool_name))
        .first()
    )
    if record:
        db.delete(record)
        db.commit()
    return {"message": "deleted"}


@router.get("/search")
async def search_tool(name: str, db: Session = Depends(get_db)):
    """Search for an AI tool by name."""
    tool = db.query(ToolInfo).filter(ToolInfo.name.ilike(f"%{name}%")).first()
    if tool:
        return {
            "name": tool.name,
            "description": tool.description,
            "category": tool.category,
            "features": tool.features,
            "getting_started_url": tool.getting_started_url,
            "similar_tools": tool.similar_tools,
        }
    # Fallback: use AI to generate info
    from app.tools.searcher import search_and_analyze_tool
    return await search_and_analyze_tool(name)


@router.get("/list")
async def list_tools(category: str = None, db: Session = Depends(get_db)):
    query = db.query(ToolInfo)
    if category:
        query = query.filter(ToolInfo.category == category)
    tools = query.all()
    return [{"name": t.name, "description": t.description, "category": t.category} for t in tools]


@router.post("/guide")
async def generate_guide(name: str):
    """Generate a detailed usage guide for an AI tool."""
    from app.ai.router import call_llm
    prompt = f"""你是一个AI工具使用专家。请为以下AI工具生成一份详细的使用指南。

工具名称：{name}

请包含以下内容（用JSON格式）：
{{
    "tool_name": "{name}",
    "overview": "工具概述（2-3句话）",
    "use_cases": [
        {{"scenario": "使用场景1", "description": "具体描述"}},
        {{"scenario": "使用场景2", "description": "具体描述"}},
        {{"scenario": "使用场景3", "description": "具体描述"}}
    ],
    "setup_steps": [
        {{"step": 1, "title": "步骤标题", "detail": "详细操作说明"}},
        {{"step": 2, "title": "步骤标题", "detail": "详细操作说明"}},
        {{"step": 3, "title": "步骤标题", "detail": "详细操作说明"}}
    ],
    "tips": ["使用技巧1", "使用技巧2", "使用技巧3"],
    "pricing": "定价信息（免费/付费/免费试用等）",
    "registration_url": "注册链接",
    "supports_google_login": true或false
}}"""

    result = await call_llm(
        task="tool_info",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=3000,
    )

    import json
    try:
        return json.loads(result)
    except Exception:
        return {"tool_name": name, "overview": result, "use_cases": [], "setup_steps": [], "tips": []}


@router.post("/auto-register")
async def auto_register_guide(name: str):
    """Generate step-by-step auto-registration guide for a tool."""
    from app.ai.router import call_llm
    prompt = f"""你是一个AI工具注册专家。请为以下工具生成自动注册的详细指引。

工具名称：{name}

请提供（JSON格式）：
{{
    "tool_name": "{name}",
    "registration_url": "注册页面URL",
    "supports_google_login": true/false,
    "supports_github_login": true/false,
    "registration_steps": [
        {{"step": 1, "action": "具体操作", "detail": "详细说明（包括要点击什么按钮、填什么内容等）"}}
    ],
    "free_tier": "免费额度说明",
    "estimated_time": "预计注册耗时",
    "auto_register_possible": true/false,
    "auto_register_method": "如果可以自动注册，说明方法（如通过Google OAuth等）"
}}"""

    result = await call_llm(
        task="tool_info",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
    )

    import json
    try:
        return json.loads(result)
    except Exception:
        return {"tool_name": name, "registration_steps": [{"step": 1, "action": result}]}
