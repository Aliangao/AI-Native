"""Feishu card action callback handler.

Handles button clicks from interactive cards (digest refresh, opportunity feedback, etc.).
Must configure the callback URL in Feishu app settings:
  Request URL: https://<your-domain>/api/feishu/card/action
"""
import os
import json
import hashlib
import asyncio
from fastapi import APIRouter, Request, Response

from app.feishu.bot import send_text, send_interactive_card

router = APIRouter()

VERIFICATION_TOKEN = os.getenv("FEISHU_VERIFICATION_TOKEN", "")
ENCRYPT_KEY = os.getenv("FEISHU_ENCRYPT_KEY", "")


def _verify_signature(timestamp: str, nonce: str, signature: str, body: bytes) -> bool:
    """Verify Feishu request signature."""
    if not VERIFICATION_TOKEN:
        return True  # Skip verification if no token configured
    bs = (timestamp + nonce + VERIFICATION_TOKEN).encode("utf-8") + body
    h = hashlib.sha1(bs)
    return signature == h.hexdigest()


@router.post("/card/action")
async def card_action_callback(request: Request):
    """Handle interactive card button clicks from Feishu."""
    body = await request.body()
    data = json.loads(body)

    # Handle URL verification challenge
    if data.get("type") == "url_verification":
        return {"challenge": data.get("challenge", "")}

    # Verify signature (optional, based on config)
    timestamp = request.headers.get("X-Lark-Request-Timestamp", "")
    nonce = request.headers.get("X-Lark-Request-Nonce", "")
    signature = request.headers.get("X-Lark-Signature", "")
    if signature and not _verify_signature(timestamp, nonce, signature, body):
        return Response(status_code=403, content="Invalid signature")

    # Extract action info
    action = data.get("action", {})
    action_value = action.get("value", {})
    action_name = action_value.get("action", "") if isinstance(action_value, dict) else ""
    open_id = data.get("open_id", "")
    open_chat_id = data.get("open_chat_id", "")
    user_id = data.get("user_id", "")

    # Target for reply: prefer chat_id, then open_id
    reply_id = open_chat_id or open_id
    reply_type = "chat_id" if open_chat_id else "open_id"

    print(f"[CardAction] action={action_name}, user={open_id}, chat={open_chat_id}", flush=True)

    # Route to action handler
    if action_name == "refresh_digest":
        return await handle_refresh_digest(reply_id, reply_type)
    elif action_name == "feedback_useful":
        return await handle_feedback(reply_id, reply_type, open_id, useful=True)
    elif action_name == "feedback_irrelevant":
        return await handle_feedback(reply_id, reply_type, open_id, useful=False)
    else:
        print(f"[CardAction] Unknown action: {action_name}", flush=True)
        return {"msg": "success"}


async def handle_refresh_digest(reply_id: str, reply_type: str):
    """Handle 'refresh digest' button click - collect fresh articles and push new card."""
    try:
        # Trigger article collection
        from app.digest.collector import collect_all_sources
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            articles = await collect_all_sources(db)
            count = len(articles) if articles else 0
        finally:
            db.close()

        # Generate and push fresh digest card
        from app.digest.summarizer import generate_daily_digest
        from app.feishu.cards import build_digest_card
        digest = await generate_daily_digest()
        card = build_digest_card(digest)

        # Return updated card to replace the old one
        return card

    except Exception as e:
        print(f"[CardAction] refresh_digest error: {e}", flush=True)
        import traceback
        traceback.print_exc()
        # Return a toast notification on error
        return {
            "toast": {
                "type": "info",
                "content": f"刷新失败，请稍后重试: {str(e)[:50]}",
            }
        }


async def handle_feedback(reply_id: str, reply_type: str, user_id: str, useful: bool):
    """Handle opportunity feedback button clicks."""
    feedback_text = "有价值" if useful else "不相关"
    print(f"[CardAction] User {user_id} feedback: {feedback_text}", flush=True)

    # Update the card to show feedback received
    if useful:
        return {
            "toast": {
                "type": "success",
                "content": "感谢反馈！我们会为你推荐更多类似的AI机遇 🎯",
            }
        }
    else:
        return {
            "toast": {
                "type": "info",
                "content": "收到！我们会优化推荐精准度 📊",
            }
        }
