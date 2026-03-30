from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import BusinessContext, OpportunityMatch


class BusinessInput(BaseModel):
    user_id: str
    content: str


router = APIRouter()


@router.post("/context")
async def add_business_context(input: BusinessInput, db: Session = Depends(get_db)):
    """Add business context from text input."""
    from app.business.extractor import extract_and_store
    try:
        result = await extract_and_store(input.user_id, input.content, "conversation", db)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e), "detail": traceback.format_exc()}


@router.post("/upload")
async def upload_document(user_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a business document for context extraction."""
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    from app.business.extractor import extract_and_store
    result = await extract_and_store(user_id, text, "document", db)
    return result


@router.get("/profile/{user_id}")
async def get_business_profile(user_id: str, db: Session = Depends(get_db)):
    """Get all business contexts for a user (their info vault)."""
    import json
    contexts = (
        db.query(BusinessContext)
        .filter(BusinessContext.user_id == user_id)
        .order_by(BusinessContext.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "content": c.content,
            "extracted_context": json.loads(c.extracted_context) if c.extracted_context else {},
            "source_type": c.source_type,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in contexts
    ]


class ContextUpdate(BaseModel):
    extracted_context: dict


@router.put("/context/{context_id}")
async def update_business_context(context_id: int, update: ContextUpdate, db: Session = Depends(get_db)):
    """Update a business context's extracted info (user calibration)."""
    import json
    ctx = db.query(BusinessContext).filter(BusinessContext.id == context_id).first()
    if not ctx:
        return {"error": "Context not found"}
    ctx.extracted_context = json.dumps(update.extracted_context, ensure_ascii=False)
    db.commit()
    # Update ChromaDB vector
    from app.business.vectorstore import update_business_context as update_vec
    update_vec(str(context_id), json.dumps(update.extracted_context, ensure_ascii=False))
    return {"message": "已更新", "id": context_id}


@router.delete("/context/{context_id}")
async def delete_business_context(context_id: int, db: Session = Depends(get_db)):
    """Delete a business context."""
    ctx = db.query(BusinessContext).filter(BusinessContext.id == context_id).first()
    if not ctx:
        return {"error": "Context not found"}
    db.delete(ctx)
    db.commit()
    # Remove from ChromaDB
    from app.business.vectorstore import delete_business_context as delete_vec
    delete_vec(str(context_id))
    return {"message": "已删除", "id": context_id}


@router.post("/rematch/{user_id}")
async def rematch_opportunities(user_id: str, db: Session = Depends(get_db)):
    """Re-run matching against existing articles for a user."""
    from app.db.models import DigestArticle
    from app.business.matcher import match_new_capability
    articles = db.query(DigestArticle).order_by(DigestArticle.id.desc()).limit(10).all()
    matched = 0
    for article in articles:
        capability = f"{article.title}: {article.summary}"
        try:
            await match_new_capability(article.id, capability, db)
            matched += 1
        except Exception as e:
            print(f"Match error for article {article.id}: {e}")
    return {"message": f"Re-matched {matched} articles", "total_articles": len(articles)}


@router.post("/seed-opportunities")
async def seed_demo_opportunities(db: Session = Depends(get_db)):
    """Seed demo opportunity data for showcase."""
    import json
    demos = [
        {
            "user_id": "demo_user", "article_id": 8, "business_context_id": 3,
            "ai_capability": "OpenAI Sora视频生成：支持生成最长60秒高清视频",
            "business_need": "美食自媒体内容创作，视频拍摄到发布耗时4-5小时",
            "opportunity_analysis": json.dumps({
                "relevance_score": 95,
                "opportunity": "用Sora生成美食场景视频素材，将单条视频制作时间从4小时缩短到30分钟",
                "value_analysis": "你的业务核心痛点是视频制作耗时长。Sora可以根据文字描述直接生成高质量美食场景视频，包括食材特写、烹饪过程动画、成品展示等。结合你现有的剪映工作流，可以用AI生成的素材替代部分实拍，大幅缩短制作周期。",
                "application_method": "将Sora作为素材生成工具接入现有工作流：1) 用文字描述需要的视频片段 2) Sora生成多个候选 3) 在剪映中与实拍素材混剪",
                "quick_test_steps": ["注册OpenAI账号并开通Sora权限", "用一条已发布视频的脚本测试Sora生成效果", "将AI生成片段与实拍素材混剪对比效果", "选择3条视频进行A/B测试对比数据"]
            }, ensure_ascii=False),
            "similarity_score": 0.85, "status": "new",
        },
        {
            "user_id": "demo_user", "article_id": 13, "business_context_id": 3,
            "ai_capability": "ElevenLabs实时语音克隆：30秒音频即可克隆声音，支持29种语言",
            "business_need": "美食自媒体希望拓展多语言市场，翻译中文内容为英文和日文",
            "opportunity_analysis": json.dumps({
                "relevance_score": 92,
                "opportunity": "用ElevenLabs克隆你的声音生成英文/日文配音，零成本实现多语言内容分发",
                "value_analysis": "你计划将美食内容拓展到YouTube和Instagram，最大障碍是多语言配音。ElevenLabs只需30秒你的中文语音样本，就能克隆你的声线生成29种语言的配音，保持个人IP一致性。这比雇佣配音员成本低95%以上。",
                "application_method": "录制30秒中文音频样本→ElevenLabs生成声音模型→将中文脚本翻译后输入生成英文/日文配音→替换原视频音轨",
                "quick_test_steps": ["录制30秒清晰中文语音上传ElevenLabs", "选一条热门视频脚本翻译为英文", "生成英文配音并替换原音轨", "发布到YouTube观察海外观众反馈"]
            }, ensure_ascii=False),
            "similarity_score": 0.82, "status": "new",
        },
        {
            "user_id": "demo_user", "article_id": 12, "business_context_id": 2,
            "ai_capability": "AI Agent市场爆发：客服、编程、数据分析三大核心场景",
            "business_need": "跨境电商日处理200+英文客服邮件，效率低下",
            "opportunity_analysis": json.dumps({
                "relevance_score": 90,
                "opportunity": "部署AI客服Agent自动回复80%常见英文邮件，每月节省120人时",
                "value_analysis": "你的团队每天处理200+英文客服邮件是最大的人力消耗。根据麦肯锡报告，AI Agent在客服场景已经成熟，可自动处理退换货咨询、物流查询、产品FAQ等标准问题。按80%自动化率计算，每天可节省4小时人工，每月节省120小时。",
                "application_method": "使用Coze/Dify搭建客服Agent→导入历史邮件训练→接入亚马逊卖家邮箱→先人工审核AI回复→逐步放开自动发送",
                "quick_test_steps": ["收集最近100条客服邮件分类统计问题类型", "使用Coze搭建FAQ客服机器人原型", "导入Top 20高频问题的标准回复", "内部测试2周统计准确率和客户满意度"]
            }, ensure_ascii=False),
            "similarity_score": 0.78, "status": "new",
        },
        {
            "user_id": "demo_user", "article_id": 10, "business_context_id": 4,
            "ai_capability": "Midjourney V7：照片级真实感图像生成，设计效率提升300%",
            "business_need": "服饰商家做图困难，缺乏专业设计能力",
            "opportunity_analysis": json.dumps({
                "relevance_score": 88,
                "opportunity": "用Midjourney V7生成服饰商品展示图和模特图，替代80%的实拍和外包设计",
                "value_analysis": "服饰电商最大的痛点就是商品图制作。Midjourney V7的照片级真实感可以直接生成虚拟模特穿搭图、场景图、营销图。结合人物一致性功能，可以保持品牌模特形象统一。相比实拍一套商品图2000-5000元，AI生成成本接近零。",
                "application_method": "拍摄商品平铺图→Midjourney生成虚拟模特上身效果→用Canva添加营销文案→直接上架各电商平台",
                "quick_test_steps": ["准备5款热销服饰的平铺照片", "在Midjourney中测试虚拟模特穿搭效果", "对比AI生成图与实拍图的点击率", "建立品牌专属的AI模特风格模板"]
            }, ensure_ascii=False),
            "similarity_score": 0.80, "status": "new",
        },
        {
            "user_id": "demo_user", "article_id": 6, "business_context_id": 1,
            "ai_capability": "Claude 4推理能力大幅提升，支持百万token上下文",
            "business_need": "在线教育公司课后口语作业批改效率低",
            "opportunity_analysis": json.dumps({
                "relevance_score": 85,
                "opportunity": "用Claude 4构建AI口语作业批改系统，释放教师80%批改时间",
                "value_analysis": "你的教师每天花3小时批改50+学生口语作业。Claude 4的百万token上下文窗口可以一次性分析一个班级所有学生的口语录音转文本，提供发音、语法、表达力等多维度评分和个性化反馈。教师只需审核AI批改结果，批改时间可从3小时缩短到30分钟。",
                "application_method": "学生提交口语录音→语音转文本→Claude 4按评分标准批改并生成个性化反馈→教师审核后发送给学生",
                "quick_test_steps": ["收集10份学生口语录音并转为文字", "设计口语评分prompt模板", "用Claude 4 API测试批改效果", "与教师人工批改结果对比准确率"]
            }, ensure_ascii=False),
            "similarity_score": 0.75, "status": "new",
        },
    ]
    added = 0
    for d in demos:
        opp = OpportunityMatch(**d)
        db.add(opp)
        added += 1
    db.commit()
    return {"message": f"Seeded {added} demo opportunities"}


class MatchToolInput(BaseModel):
    user_id: str
    tool_name: str
    tool_description: str


@router.post("/match-tool")
async def match_tool_to_business(input: MatchToolInput, db: Session = Depends(get_db)):
    """Match a specific tool's capabilities against user's business contexts.

    This bridges Tools -> Business: after exploring a tool, check if it matches your business.
    """
    import json
    # Check if user has business contexts
    contexts = db.query(BusinessContext).filter(BusinessContext.user_id == input.user_id).all()
    if not contexts:
        return {"matches": [], "message": "请先录入你的业务信息，AI才能为你匹配机遇"}

    capability = f"{input.tool_name}: {input.tool_description}"

    # Check for existing match with same tool
    existing = db.query(OpportunityMatch).filter(
        OpportunityMatch.user_id == input.user_id,
        OpportunityMatch.ai_capability.contains(input.tool_name),
    ).all()

    if existing:
        # Return existing matches
        return {
            "matches": [
                {
                    "id": m.id,
                    "ai_capability": m.ai_capability,
                    "business_need": m.business_need,
                    "opportunity_analysis": m.opportunity_analysis,
                    "similarity_score": m.similarity_score,
                    "status": m.status,
                }
                for m in existing
            ],
            "message": f"找到 {len(existing)} 条与 {input.tool_name} 相关的业务匹配",
        }

    # Run new matching
    try:
        from app.business.matcher import match_new_capability
        await match_new_capability(None, capability, db)
    except Exception as e:
        print(f"[match-tool] Matching error: {e}", flush=True)

    # Fetch newly created matches
    matches = (
        db.query(OpportunityMatch)
        .filter(
            OpportunityMatch.user_id == input.user_id,
            OpportunityMatch.ai_capability.contains(input.tool_name),
        )
        .order_by(OpportunityMatch.created_at.desc())
        .limit(5)
        .all()
    )
    return {
        "matches": [
            {
                "id": m.id,
                "ai_capability": m.ai_capability,
                "business_need": m.business_need,
                "opportunity_analysis": m.opportunity_analysis,
                "similarity_score": m.similarity_score,
                "status": m.status,
            }
            for m in matches
        ],
        "message": f"为 {input.tool_name} 找到 {len(matches)} 条业务匹配",
    }


@router.get("/opportunities/{user_id}")
async def get_opportunities(user_id: str, db: Session = Depends(get_db)):
    """Get matched opportunities for a user."""
    matches = (
        db.query(OpportunityMatch)
        .filter(OpportunityMatch.user_id == user_id)
        .order_by(OpportunityMatch.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": m.id,
            "ai_capability": m.ai_capability,
            "business_need": m.business_need,
            "opportunity_analysis": m.opportunity_analysis,
            "similarity_score": m.similarity_score,
            "status": m.status,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in matches
    ]
