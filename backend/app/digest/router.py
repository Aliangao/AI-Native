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
            "ai_capability": a.ai_capability,
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
            "ai_capability": a.ai_capability,
            "importance": a.importance,
            "published_at": a.published_at.isoformat() if a.published_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in articles
    ]


@router.post("/seed")
async def seed_demo_articles(db: Session = Depends(get_db)):
    """Seed demo articles for showcase."""
    from datetime import datetime, timedelta
    import json
    now = datetime.utcnow()
    demo_articles = [
        {"title": "Claude 4 发布：推理能力大幅提升，支持百万token上下文", "url": "https://anthropic.com", "source": "Anthropic Blog", "category": "model_update", "summary": "Anthropic发布Claude 4，推理能力较前代提升60%，支持百万token上下文窗口，在代码生成、数学推理、多步骤规划等任务上表现突出", "summary_zh": "Anthropic发布Claude 4，推理能力较前代提升60%，支持百万token上下文窗口，在代码生成、数学推理、多步骤规划等任务上表现突出", "ai_capability": "超长上下文理解、高级推理、代码生成", "importance": 5, "published_at": now - timedelta(hours=2)},
        {"title": "Cursor 1.0 正式版发布：AI编程进入新纪元", "url": "https://cursor.com", "source": "TechCrunch", "category": "tool_release", "summary": "Cursor发布1.0正式版，新增Agent模式可自主完成跨文件重构，代码补全准确率提升至95%，成为开发者最受欢迎的AI编程工具", "summary_zh": "Cursor发布1.0正式版，新增Agent模式可自主完成跨文件重构，代码补全准确率提升至95%，成为开发者最受欢迎的AI编程工具", "ai_capability": "AI代码生成、智能重构、自主编程Agent", "importance": 5, "published_at": now - timedelta(hours=3)},
        {"title": "OpenAI Sora 正式面向所有用户开放", "url": "https://openai.com/sora", "source": "The Verge", "category": "tool_release", "summary": "OpenAI宣布Sora视频生成模型正式面向所有ChatGPT用户开放，支持生成最长60秒的高清视频，将彻底改变短视频内容创作流程", "summary_zh": "OpenAI宣布Sora视频生成模型正式面向所有ChatGPT用户开放，支持生成最长60秒的高清视频，将彻底改变短视频内容创作流程", "ai_capability": "AI视频生成、文生视频", "importance": 5, "published_at": now - timedelta(hours=4)},
        {"title": "Google DeepMind 发布 Gemini 2.5 Pro：多模态推理新标杆", "url": "https://deepmind.google", "source": "Google Blog", "category": "model_update", "summary": "Google DeepMind发布Gemini 2.5 Pro，在多模态推理基准测试中全面超越GPT-4o，支持图片、视频、音频的深度理解与分析", "summary_zh": "Google DeepMind发布Gemini 2.5 Pro，在多模态推理基准测试中全面超越GPT-4o，支持图片、视频、音频的深度理解与分析", "ai_capability": "多模态理解、视觉推理、音频分析", "importance": 4, "published_at": now - timedelta(hours=5)},
        {"title": "Midjourney V7 发布：照片级真实感图像生成", "url": "https://midjourney.com", "source": "AI News", "category": "tool_release", "summary": "Midjourney V7版本发布，图像生成质量达到照片级真实感，新增人物一致性、风格迁移等功能，设计师工作效率提升300%", "summary_zh": "Midjourney V7版本发布，图像生成质量达到照片级真实感，新增人物一致性、风格迁移等功能，设计师工作效率提升300%", "ai_capability": "AI图像生成、风格迁移、照片级渲染", "importance": 4, "published_at": now - timedelta(hours=6)},
        {"title": "豆包大模型发布Seed 2.0：中文理解能力行业第一", "url": "https://doubao.com", "source": "36Kr", "category": "model_update", "summary": "字节跳动发布豆包大模型Seed 2.0版本，在中文理解、写作、对话等任务上超越所有国产模型，API价格降低50%，助力开发者降本增效", "summary_zh": "字节跳动发布豆包大模型Seed 2.0版本，在中文理解、写作、对话等任务上超越所有国产模型，API价格降低50%，助力开发者降本增效", "ai_capability": "中文理解、AI对话、低成本推理", "importance": 4, "published_at": now - timedelta(hours=7)},
        {"title": "AI Agent 市场报告：2026年市场规模预计突破100亿美元", "url": "https://mckinsey.com", "source": "McKinsey", "category": "industry", "summary": "麦肯锡最新报告指出，AI Agent市场2026年规模将突破100亿美元，客服、编程、数据分析是三大核心应用场景，企业采用率同比增长200%", "summary_zh": "麦肯锡最新报告指出，AI Agent市场2026年规模将突破100亿美元，客服、编程、数据分析是三大核心应用场景，企业采用率同比增长200%", "ai_capability": "AI Agent、自动化客服、智能数据分析", "importance": 4, "published_at": now - timedelta(hours=8)},
        {"title": "ElevenLabs 推出实时语音克隆：30秒音频即可复制任何声音", "url": "https://elevenlabs.io", "source": "Product Hunt", "category": "tool_release", "summary": "ElevenLabs发布实时语音克隆功能，仅需30秒音频样本即可生成高保真克隆语音，支持29种语言，可用于播客、有声书、教育等场景", "summary_zh": "ElevenLabs发布实时语音克隆功能，仅需30秒音频样本即可生成高保真克隆语音，支持29种语言，可用于播客、有声书、教育等场景", "ai_capability": "语音克隆、多语言语音合成、TTS", "importance": 3, "published_at": now - timedelta(hours=9)},
        {"title": "Dify 开源框架发布 1.0：企业级LLM应用开发平台", "url": "https://dify.ai", "source": "GitHub Trending", "category": "tool_release", "summary": "Dify开源框架1.0版本发布，提供可视化工作流编排、RAG知识库、Agent构建等企业级能力，GitHub星标突破10万", "summary_zh": "Dify开源框架1.0版本发布，提供可视化工作流编排、RAG知识库、Agent构建等企业级能力，GitHub星标突破10万", "ai_capability": "LLM应用开发、RAG、AI工作流编排", "importance": 3, "published_at": now - timedelta(hours=10)},
        {"title": "斯坦福研究：AI辅助编程使初级开发者生产力提升55%", "url": "https://stanford.edu", "source": "Stanford HAI", "category": "research", "summary": "斯坦福大学人工智能研究所最新研究表明，使用AI编程助手的初级开发者生产力提升55%，而高级开发者提升约15%，AI正在重塑软件开发人才结构", "summary_zh": "斯坦福大学人工智能研究所最新研究表明，使用AI编程助手的初级开发者生产力提升55%，而高级开发者提升约15%，AI正在重塑软件开发人才结构", "ai_capability": "AI编程辅助、代码生成", "importance": 3, "published_at": now - timedelta(hours=11)},
        {"title": "Notion AI 全面升级：成为团队的AI知识管理助手", "url": "https://notion.so", "source": "Notion Blog", "category": "tool_release", "summary": "Notion AI迎来重大升级，新增AI问答、自动文档整理、会议纪要生成等功能，可基于团队知识库回答任何业务问题", "summary_zh": "Notion AI迎来重大升级，新增AI问答、自动文档整理、会议纪要生成等功能，可基于团队知识库回答任何业务问题", "ai_capability": "AI知识管理、文档智能整理、RAG问答", "importance": 3, "published_at": now - timedelta(hours=12)},
        {"title": "Meta 开源 LLaMA 4：405B参数模型性能比肩GPT-4", "url": "https://ai.meta.com", "source": "Meta AI Blog", "category": "model_update", "summary": "Meta开源LLaMA 4系列模型，最大405B参数版本在多项基准测试中比肩GPT-4，8B小模型可在手机端运行，推动AI普惠化进程", "summary_zh": "Meta开源LLaMA 4系列模型，最大405B参数版本在多项基准测试中比肩GPT-4，8B小模型可在手机端运行，推动AI普惠化进程", "ai_capability": "开源大模型、端侧AI部署", "importance": 4, "published_at": now - timedelta(hours=13)},
    ]
    added = 0
    for a in demo_articles:
        article = DigestArticle(**a)
        db.add(article)
        added += 1
    db.commit()
    return {"message": f"Seeded {added} demo articles"}


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
