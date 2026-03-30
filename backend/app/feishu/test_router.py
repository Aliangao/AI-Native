"""Feishu test endpoints - verify card push and bot capabilities."""
import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class TestPushRequest(BaseModel):
    receive_id: str  # open_id, user_id, or chat_id
    receive_id_type: str = "chat_id"  # open_id / user_id / chat_id
    card_type: str = "digest"  # digest / tool / opportunity


class TestTextRequest(BaseModel):
    receive_id: str
    receive_id_type: str = "chat_id"
    text: str = "🎉 这是一条来自 AI Native 工作台的测试消息！"


@router.post("/test-text")
async def test_text_push(req: TestTextRequest):
    """Send a test text message to verify basic push capability."""
    from app.feishu.bot import send_text
    response = await send_text(req.receive_id, req.text, req.receive_id_type)
    return {
        "success": response.success() if response else False,
        "code": response.code if response else -1,
        "msg": response.msg if response else "no response",
    }


@router.post("/test-card")
async def test_card_push(req: TestPushRequest):
    """Send a test interactive card to verify card push capability."""
    from app.feishu.bot import send_interactive_card
    from app.feishu.cards import build_digest_card, build_tool_card, build_opportunity_card

    if req.card_type == "digest":
        card = build_digest_card({
            "date": "2026-03-30",
            "article_count": 5,
            "digest": (
                "**📌 今日AI要闻**\n\n"
                "1. 🔥 **Claude 4 发布** - Anthropic 发布新一代模型，推理能力大幅提升\n"
                "2. 🛠️ **Cursor 1.0 正式版** - AI编程工具完成重大升级\n"
                "3. 🎨 **Midjourney V7** - 图像生成质量再次突破\n"
                "4. 🤖 **豆包大模型更新** - 字节跳动发布新版本，中文能力增强\n"
                "5. 📊 **AI Agent 市场报告** - 2026年AI Agent市场规模预计突破100亿美元"
            ),
        })
    elif req.card_type == "tool":
        card = build_tool_card({
            "name": "Cursor",
            "description": "AI驱动的代码编辑器，让编程效率提升10倍",
            "category": "编程工具",
            "features": ["AI代码补全", "智能重构", "自然语言编程", "多模型支持"],
            "getting_started": "1. 访问 cursor.com 下载\n2. 导入 VS Code 配置\n3. 开始用自然语言描述需求",
            "getting_started_url": "https://cursor.com",
            "similar_tools": ["GitHub Copilot", "Windsurf", "Trae"],
            "verdict": "目前最强的AI编程工具，适合所有开发者，强烈推荐体验",
        })
    elif req.card_type == "opportunity":
        card = build_opportunity_card({
            "relevance_score": 92,
            "opportunity": "利用 AI Agent 自动化客户服务流程，预计降低40%人工成本",
            "value_analysis": "你的业务涉及大量重复性客户咨询，新发布的 AI Agent 框架可以自动处理80%的常见问题，释放客服团队专注高价值客户。",
            "application_method": "部署基于豆包大模型的智能客服 Agent，接入现有工单系统，先从FAQ场景开始试点。",
            "quick_test_steps": [
                "使用 Coze/扣子 搭建FAQ机器人原型",
                "导入50条历史高频问题作为知识库",
                "内部测试1周收集准确率数据",
                "根据结果决定是否扩展到更多场景",
            ],
        })
    else:
        return {"error": f"Unknown card_type: {req.card_type}"}

    response = await send_interactive_card(req.receive_id, card, req.receive_id_type)
    return {
        "success": response.success() if response else False,
        "code": response.code if response else -1,
        "msg": response.msg if response else "no response",
        "card_type": req.card_type,
    }


@router.get("/status")
async def feishu_status():
    """Check Feishu bot configuration status."""
    import os
    app_id = os.getenv("FEISHU_APP_ID", "")
    app_secret = os.getenv("FEISHU_APP_SECRET", "")
    digest_chats = os.getenv("FEISHU_DIGEST_CHAT_IDS", "")

    return {
        "app_id_configured": bool(app_id),
        "app_secret_configured": bool(app_secret),
        "digest_chat_ids": digest_chats.split(",") if digest_chats else [],
        "bot_mode": "websocket",
    }
