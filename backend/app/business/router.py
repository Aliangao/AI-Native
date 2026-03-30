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
    result = await extract_and_store(input.user_id, input.content, "conversation", db)
    return result


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
