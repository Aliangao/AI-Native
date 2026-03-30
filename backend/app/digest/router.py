from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import DigestArticle

router = APIRouter()


@router.get("/articles")
async def get_articles(limit: int = 20, category: str = None, db: Session = Depends(get_db)):
    query = db.query(DigestArticle).order_by(DigestArticle.created_at.desc())
    if category:
        query = query.filter(DigestArticle.category == category)
    articles = query.limit(limit).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "url": a.url,
            "source": a.source,
            "category": a.category,
            "summary": a.summary,
            "summary_zh": a.summary_zh,
            "importance": a.importance,
            "published_at": a.published_at.isoformat() if a.published_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in articles
    ]


@router.get("/top")
async def get_top_articles(limit: int = 5, db: Session = Depends(get_db)):
    """Get top articles ranked by importance."""
    articles = (
        db.query(DigestArticle)
        .order_by(DigestArticle.importance.desc(), DigestArticle.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": a.id,
            "title": a.title,
            "url": a.url,
            "source": a.source,
            "category": a.category,
            "summary": a.summary,
            "summary_zh": a.summary_zh,
            "importance": a.importance,
            "published_at": a.published_at.isoformat() if a.published_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in articles
    ]


@router.post("/collect")
async def trigger_collection():
    """Manually trigger news collection."""
    from app.digest.collector import collect_and_summarize
    count = await collect_and_summarize()
    return {"message": f"Collected and summarized {count} articles"}


@router.post("/translate/{article_id}")
async def translate_article(article_id: int, db: Session = Depends(get_db)):
    """Translate an article's title and summary to Chinese."""
    article = db.query(DigestArticle).filter(DigestArticle.id == article_id).first()
    if not article:
        return {"error": "Article not found"}

    if article.summary_zh:
        return {"title": article.title, "summary_zh": article.summary_zh}

    from app.ai.router import call_llm
    prompt = f"""请将以下英文AI资讯翻译为流畅的中文。只需返回翻译结果，不要加任何额外说明。

标题: {article.title}
摘要: {article.summary}

请按以下格式返回：
标题翻译: ...
摘要翻译: ..."""

    result = await call_llm(
        task="summarize",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    # Parse translation result
    lines = result.strip().split("\n")
    title_zh = article.title
    summary_zh = result
    for line in lines:
        if line.startswith("标题翻译"):
            title_zh = line.split(":", 1)[-1].strip().strip("：").strip()
        elif line.startswith("摘要翻译"):
            summary_zh = line.split(":", 1)[-1].strip().strip("：").strip()

    article.summary_zh = summary_zh
    db.commit()

    return {"title_zh": title_zh, "summary_zh": summary_zh}
