from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.db.models import Favorite, DigestArticle, OpportunityMatch

router = APIRouter()


class FavoriteInput(BaseModel):
    user_id: str
    item_type: str  # article, tool, opportunity
    item_id: int
    note: Optional[str] = None


@router.post("/add")
async def add_favorite(input: FavoriteInput, db: Session = Depends(get_db)):
    existing = db.query(Favorite).filter(
        Favorite.user_id == input.user_id,
        Favorite.item_type == input.item_type,
        Favorite.item_id == input.item_id,
    ).first()
    if existing:
        return {"message": "already_favorited", "id": existing.id}

    fav = Favorite(
        user_id=input.user_id,
        item_type=input.item_type,
        item_id=input.item_id,
        note=input.note,
    )
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return {"message": "favorited", "id": fav.id}


@router.delete("/remove")
async def remove_favorite(user_id: str, item_type: str, item_id: int, db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.item_type == item_type,
        Favorite.item_id == item_id,
    ).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"message": "removed"}


@router.get("/list/{user_id}")
async def list_favorites(user_id: str, item_type: str = None, db: Session = Depends(get_db)):
    query = db.query(Favorite).filter(Favorite.user_id == user_id)
    if item_type:
        query = query.filter(Favorite.item_type == item_type)
    favs = query.order_by(Favorite.created_at.desc()).all()

    results = []
    for fav in favs:
        item = {"id": fav.id, "item_type": fav.item_type, "item_id": fav.item_id,
                "note": fav.note, "created_at": fav.created_at.isoformat() if fav.created_at else None}
        # Enrich with item details
        if fav.item_type == "article":
            article = db.query(DigestArticle).filter(DigestArticle.id == fav.item_id).first()
            if article:
                item["detail"] = {"title": article.title, "summary": article.summary, "source": article.source, "url": article.url}
        elif fav.item_type == "opportunity":
            opp = db.query(OpportunityMatch).filter(OpportunityMatch.id == fav.item_id).first()
            if opp:
                item["detail"] = {"ai_capability": opp.ai_capability, "opportunity_analysis": opp.opportunity_analysis}
        results.append(item)
    return results


@router.get("/ids/{user_id}")
async def get_favorite_ids(user_id: str, item_type: str, db: Session = Depends(get_db)):
    """Get just the IDs of favorited items for quick lookup."""
    favs = db.query(Favorite.item_id).filter(
        Favorite.user_id == user_id,
        Favorite.item_type == item_type,
    ).all()
    return [f[0] for f in favs]
