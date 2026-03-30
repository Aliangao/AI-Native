"""Feishu message handler - central routing hub."""
import json
import asyncio
import lark_oapi as lark
from lark_oapi.api.im.v1 import P2ImMessageReceiveV1

from app.ai.router import call_llm
from app.ai.prompts import INTENT_DETECT
from app.tools.detector import detect_tool_mention
from app.feishu.bot import send_text, send_interactive_card


async def handle_message(event: P2ImMessageReceiveV1):
    """Handle incoming Feishu messages."""
    msg = event.event.message
    sender = event.event.sender

    # Only handle text messages for now
    if msg.message_type != "text":
        await send_text(sender.sender_id.open_id, "目前支持文字消息，文档上传功能即将上线！")
        return

    content = json.loads(msg.content)
    text = content.get("text", "").strip()

    if not text:
        return

    # Remove @bot mention prefix
    if text.startswith("@"):
        text = text.split(" ", 1)[-1] if " " in text else text

    # Quick check: is a known AI tool mentioned?
    tool_name = detect_tool_mention(text)
    if tool_name:
        await handle_tool_query(sender.sender_id.open_id, tool_name)
        return

    # Use LLM for intent detection
    intent_prompt = INTENT_DETECT.format(message=text)
    try:
        result = await call_llm(
            task="intent_detect",
            messages=[{"role": "user", "content": intent_prompt}],
            temperature=0.3,
            max_tokens=200,
        )
        intent_data = json.loads(result)
        intent = intent_data.get("intent", "general_chat")
        entity = intent_data.get("entity", "")
    except Exception:
        intent = "general_chat"
        entity = ""

    if intent == "ask_tool" and entity:
        await handle_tool_query(sender.sender_id.open_id, entity)
    elif intent == "upload_business":
        await handle_business_input(sender.sender_id.open_id, text)
    elif intent == "ask_digest":
        await handle_digest_query(sender.sender_id.open_id, text)
    else:
        await handle_general_chat(sender.sender_id.open_id, text)


async def handle_tool_query(user_id: str, tool_name: str):
    """Handle AI tool queries - Level 2."""
    from app.tools.searcher import search_and_analyze_tool
    from app.feishu.cards import build_tool_card

    await send_text(user_id, f"正在为你查找 {tool_name} 的信息...")

    tool_info = await search_and_analyze_tool(tool_name)
    card = build_tool_card(tool_info)
    await send_interactive_card(user_id, card)


async def handle_business_input(user_id: str, text: str):
    """Handle business context input - Level 3."""
    from app.business.extractor import extract_and_store
    from app.db.database import SessionLocal

    await send_text(user_id, "收到！正在分析你的业务信息...")

    db = SessionLocal()
    try:
        result = await extract_and_store(user_id, text, "conversation", db)
        extracted = result.get("extracted_context", {})

        response = "✅ 业务信息已记录！我提取到以下关键信息：\n\n"
        if isinstance(extracted, dict):
            if extracted.get("domain"):
                response += f"📌 业务领域：{extracted['domain']}\n"
            if extracted.get("core_business"):
                response += f"💼 核心业务：{extracted['core_business']}\n"
            if extracted.get("ai_opportunities"):
                response += f"🎯 AI机会点：{', '.join(extracted['ai_opportunities'][:3])}\n"
        response += "\n当有新的AI能力与你的业务匹配时，我会主动通知你！"

        await send_text(user_id, response)
    finally:
        db.close()


async def handle_digest_query(user_id: str, text: str):
    """Handle digest/news queries - Level 1."""
    from app.digest.summarizer import generate_daily_digest
    from app.feishu.cards import build_digest_card

    digest = await generate_daily_digest()
    card = build_digest_card(digest)
    await send_interactive_card(user_id, card)


async def handle_general_chat(user_id: str, text: str):
    """Handle general conversation."""
    system_msg = """你是AI Native工作台的智能助手。你的职责是：
1. 帮助用户了解最新的AI资讯和动态
2. 推荐和介绍AI工具
3. 分析AI技术如何应用到用户的业务中

请用友好、专业的方式回复。如果用户提到具体的AI工具，请详细介绍。
如果用户描述了他们的业务，请建议他们说"我想录入我的业务信息"来让系统记录。"""

    result = await call_llm(
        task="chat",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": text},
        ],
        temperature=0.7,
    )
    await send_text(user_id, result)
