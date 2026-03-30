"""AI news collector - fetches from RSS feeds and web sources."""
from __future__ import annotations
import json
import html
import feedparser
import httpx
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import DigestArticle
from app.ai.router import call_llm
from app.ai.prompts import DIGEST_SUMMARIZE

# RSS sources for AI news
RSS_SOURCES = [
    {"name": "AI科技评论", "url": "https://rsshub.app/36kr/motif/452"},
    {"name": "量子位", "url": "https://rsshub.app/qbitai/category/资讯"},
    {"name": "机器之心", "url": "https://rsshub.app/jiqizhixin/daily"},
    {"name": "Hacker News AI", "url": "https://hnrss.org/newest?q=AI+LLM"},
    {"name": "The Verge AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"},
]


async def fetch_rss_articles(source: dict) -> list[dict]:
    """Fetch articles from an RSS feed."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(source["url"])
            feed = feedparser.parse(resp.text)
            articles = []
            for entry in feed.entries[:5]:  # max 5 per source
                articles.append({
                    "title": html.unescape(entry.get("title", "")),
                    "url": entry.get("link", ""),
                    "content": entry.get("summary", entry.get("description", "")),
                    "source": source["name"],
                    "published_at": datetime(*entry.published_parsed[:6]) if hasattr(entry, "published_parsed") and entry.published_parsed else None,
                })
            return articles
    except Exception as e:
        print(f"Error fetching {source['name']}: {e}")
        return []


async def summarize_article(article: dict) -> dict:
    """Use LLM to summarize an article."""
    prompt = DIGEST_SUMMARIZE.format(content=f"标题: {article['title']}\n\n{article['content'][:2000]}")
    try:
        result = await call_llm(
            task="summarize",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        data = json.loads(result)
        return {
            **article,
            "summary": data.get("summary", ""),
            "category": data.get("category", "industry"),
            "ai_capability": data.get("ai_capability", ""),
            "importance": data.get("importance", 3),
        }
    except Exception as e:
        print(f"Error summarizing: {e}")
        return {
            **article,
            "summary": article["content"][:200],
            "category": "industry",
            "ai_capability": "",
            "importance": 3,
        }


async def collect_and_summarize() -> int:
    """Main collection pipeline: fetch → summarize → store → trigger matching."""
    all_articles = []
    for source in RSS_SOURCES:
        articles = await fetch_rss_articles(source)
        all_articles.extend(articles)

    db = SessionLocal()
    count = 0
    try:
        for article in all_articles:
            # Skip duplicates
            existing = db.query(DigestArticle).filter(DigestArticle.url == article["url"]).first()
            if existing:
                continue

            summarized = await summarize_article(article)
            db_article = DigestArticle(
                title=summarized["title"],
                url=summarized["url"],
                source=summarized["source"],
                category=summarized["category"],
                summary=summarized["summary"],
                ai_capability=summarized["ai_capability"],
                importance=summarized["importance"],
                published_at=summarized.get("published_at"),
            )
            db.add(db_article)
            db.commit()
            count += 1

            # Trigger Level 3 matching if article has AI capability info
            if summarized.get("ai_capability"):
                try:
                    from app.business.matcher import match_new_capability
                    await match_new_capability(db_article.id, summarized["ai_capability"], db)
                except Exception as e:
                    print(f"[Matcher] Error matching capability: {e}")

        db.commit()
    finally:
        db.close()

    return count
