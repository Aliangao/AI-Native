import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.digest.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    # Auto-seed demo data if database is empty (Railway ephemeral filesystem fix)
    from app.db.auto_seed import auto_seed_if_empty
    auto_seed_if_empty()
    start_scheduler()
    # Start Feishu WebSocket bot in background thread
    _start_feishu_bot()
    yield
    # Shutdown
    stop_scheduler()


def _start_feishu_bot():
    """Start Feishu bot in a background thread so it doesn't block the server."""
    import threading
    try:
        from app.feishu.websocket_bot import start_bot
        app_id = os.getenv("FEISHU_APP_ID", "")
        app_secret = os.getenv("FEISHU_APP_SECRET", "")
        if not app_id or not app_secret:
            print("[Main] Feishu bot skipped: FEISHU_APP_ID/APP_SECRET not set", flush=True)
            return
        thread = threading.Thread(target=start_bot, daemon=True, name="feishu-bot")
        thread.start()
        print("[Main] Feishu WebSocket bot started in background thread", flush=True)
    except Exception as e:
        print(f"[Main] Failed to start Feishu bot: {e}", flush=True)


app = FastAPI(title="AI Native Workstation", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Import and include routers
from app.digest.router import router as digest_router
from app.tools.router import router as tools_router
from app.business.router import router as business_router
from app.favorites.router import router as favorites_router

from app.feishu.test_router import router as feishu_test_router
from app.feishu.card_callback import router as feishu_card_router

app.include_router(digest_router, prefix="/api/digest", tags=["digest"])
app.include_router(tools_router, prefix="/api/tools", tags=["tools"])
app.include_router(business_router, prefix="/api/business", tags=["business"])
app.include_router(favorites_router, prefix="/api/favorites", tags=["favorites"])
app.include_router(feishu_test_router, prefix="/api/feishu", tags=["feishu"])
app.include_router(feishu_card_router, prefix="/api/feishu", tags=["feishu-card"])
