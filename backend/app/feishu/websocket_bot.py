"""Feishu WebSocket bot entry point - run this to start the bot."""
import os
import asyncio
import json
import lark_oapi as lark
from lark_oapi.api.im.v1 import P2ImMessageReceiveV1
from dotenv import load_dotenv

load_dotenv()


def create_message_handler():
    """Create the message receive event handler."""

    def handle(event: P2ImMessageReceiveV1):
        """Synchronous handler that dispatches to async handler in a new thread."""
        import threading
        import sys

        print(f"[Bot] Received message, dispatching to handler thread...", flush=True)

        def run_async():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(_async_handle(event))
                print(f"[Bot] Handler thread completed successfully", flush=True)
            except Exception as e:
                print(f"[Bot] Thread error: {e}", flush=True)
                import traceback
                traceback.print_exc()
                sys.stdout.flush()
            finally:
                loop.close()

        thread = threading.Thread(target=run_async, daemon=True)
        thread.start()

    async def _async_handle(event: P2ImMessageReceiveV1):
        from app.feishu.handler import handle_message
        print(f"[Bot] _async_handle called", flush=True)
        try:
            await handle_message(event)
            print(f"[Bot] handle_message completed", flush=True)
        except Exception as e:
            print(f"[Bot] Error handling message: {e}", flush=True)
            import traceback
            traceback.print_exc()

    return handle



def start_bot():
    """Start the Feishu bot in WebSocket mode."""
    app_id = os.getenv("FEISHU_APP_ID", "")
    app_secret = os.getenv("FEISHU_APP_SECRET", "")

    if not app_id or not app_secret:
        print("[Bot] Error: FEISHU_APP_ID and FEISHU_APP_SECRET must be set")
        return

    handler = lark.EventDispatcherHandler.builder(
        os.getenv("FEISHU_ENCRYPT_KEY", ""),
        os.getenv("FEISHU_VERIFICATION_TOKEN", ""),
    ).register_p2_im_message_receive_v1(create_message_handler()).build()

    cli = lark.ws.Client(
        app_id=app_id,
        app_secret=app_secret,
        event_handler=handler,
        log_level=lark.LogLevel.DEBUG,
    )

    print("[Bot] Starting Feishu WebSocket bot...")
    cli.start()


if __name__ == "__main__":
    start_bot()
