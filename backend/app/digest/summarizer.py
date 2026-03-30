"""Daily digest generation."""
import json
from app.ai.router import call_llm
from app.ai.prompts import DIGEST_DAILY
from app.db.database import SessionLocal
from app.db.models import DigestArticle
from datetime import datetime, timedelta


async def generate_daily_digest() -> dict:
    """Generate a daily digest from collected articles."""
    db = SessionLocal()
    try:
        yesterday = datetime.utcnow() - timedelta(hours=24)
        articles = (
            db.query(DigestArticle)
            .filter(DigestArticle.created_at >= yesterday)
            .order_by(DigestArticle.importance.desc())
            .limit(15)
            .all()
        )

        if not articles:
            return {"summary": "今日暂无新的AI资讯", "articles": []}

        articles_text = "\n\n".join(
            f"[{a.source}] {a.title}\n摘要: {a.summary}\n重要性: {a.importance}/5"
            for a in articles
        )

        prompt = DIGEST_DAILY.format(articles=articles_text)
        result = await call_llm(
            task="summarize",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )

        return {
            "digest": result,
            "article_count": len(articles),
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
        }
    finally:
        db.close()
