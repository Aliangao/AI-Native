"""Business context extraction and vectorization."""
import json
from sqlalchemy.orm import Session

from app.ai.router import call_llm
from app.ai.prompts import EXTRACT_BUSINESS
from app.db.models import BusinessContext
from app.business.vectorstore import add_business_context


async def extract_and_store(user_id: str, content: str, source_type: str, db: Session) -> dict:
    """Extract structured business context and store in both SQLite and ChromaDB."""
    # Use strong model for business context extraction
    prompt = EXTRACT_BUSINESS.format(content=content)
    result = await call_llm(
        task="extract_business",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    try:
        extracted = json.loads(result)
    except json.JSONDecodeError:
        extracted = {"raw": result}

    # Store in SQLite
    ctx = BusinessContext(
        user_id=user_id,
        content=content,
        extracted_context=json.dumps(extracted, ensure_ascii=False),
        source_type=source_type,
    )
    db.add(ctx)
    db.commit()
    db.refresh(ctx)

    # Store in ChromaDB for vector search
    add_business_context(
        context_id=str(ctx.id),
        user_id=user_id,
        text=json.dumps(extracted, ensure_ascii=False),
    )

    return {
        "id": ctx.id,
        "extracted_context": extracted,
        "message": "业务上下文已成功提取和存储",
    }
