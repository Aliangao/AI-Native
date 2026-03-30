"""Feishu Bot - WebSocket mode connection and message pushing."""
import os
import json
import traceback
import lark_oapi as lark
from lark_oapi.api.im.v1 import CreateMessageRequest, CreateMessageRequestBody

# Feishu app credentials
APP_ID = os.getenv("FEISHU_APP_ID", "")
APP_SECRET = os.getenv("FEISHU_APP_SECRET", "")

_client: lark.Client = None


def get_client() -> lark.Client:
    global _client
    if _client is None:
        _client = lark.Client.builder().app_id(APP_ID).app_secret(APP_SECRET).build()
    return _client


def send_message_sync(receive_id: str, msg_type: str, content: str, receive_id_type: str = "open_id"):
    """Send a message to a Feishu user or chat (synchronous)."""
    client = get_client()
    body = CreateMessageRequestBody.builder() \
        .receive_id(receive_id) \
        .msg_type(msg_type) \
        .content(content) \
        .build()
    request = CreateMessageRequest.builder() \
        .receive_id_type(receive_id_type) \
        .request_body(body) \
        .build()
    print(f"[Feishu] Sending {msg_type} to {receive_id} (type={receive_id_type})", flush=True)
    try:
        response = client.im.v1.message.create(request)
        if not response.success():
            print(f"[Feishu] Send message failed: {response.code} - {response.msg}", flush=True)
        else:
            print(f"[Feishu] Message sent successfully!", flush=True)
        return response
    except Exception as e:
        print(f"[Feishu] Exception sending message: {e}", flush=True)
        traceback.print_exc()
        raise


async def send_message(receive_id: str, msg_type: str, content: str, receive_id_type: str = "open_id"):
    """Send a message (async wrapper around sync call)."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_message_sync, receive_id, msg_type, content, receive_id_type)


async def send_text(receive_id: str, text: str, receive_id_type: str = "open_id"):
    """Send a plain text message."""
    content = json.dumps({"text": text})
    return await send_message(receive_id, "text", content, receive_id_type)


async def send_interactive_card(receive_id: str, card: dict, receive_id_type: str = "open_id"):
    """Send an interactive card message."""
    content = json.dumps(card)
    return await send_message(receive_id, "interactive", content, receive_id_type)


async def push_daily_digest(digest: dict):
    """Push daily digest to subscribed users/groups."""
    from app.feishu.cards import build_digest_card
    card = build_digest_card(digest)
    subscribed_chats = os.getenv("FEISHU_DIGEST_CHAT_IDS", "").split(",")
    for chat_id in subscribed_chats:
        if chat_id.strip():
            await send_interactive_card(chat_id.strip(), card, "chat_id")


async def push_opportunity_notification(user_id: str, analysis: dict):
    """Push an opportunity match notification to a user."""
    from app.feishu.cards import build_opportunity_card
    card = build_opportunity_card(analysis)
    await send_interactive_card(user_id, card)
