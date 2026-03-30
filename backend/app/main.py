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
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()


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

app.include_router(digest_router, prefix="/api/digest", tags=["digest"])
app.include_router(tools_router, prefix="/api/tools", tags=["tools"])
app.include_router(business_router, prefix="/api/business", tags=["business"])
app.include_router(favorites_router, prefix="/api/favorites", tags=["favorites"])
app.include_router(feishu_test_router, prefix="/api/feishu", tags=["feishu"])
