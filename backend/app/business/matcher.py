"""Opportunity matching engine - the core innovation of Level 3."""
import json
from sqlalchemy.orm import Session

from app.ai.router import call_llm
from app.ai.prompts import MATCH_OPPORTUNITY
from app.business.vectorstore import search_matching_contexts
from app.db.models import OpportunityMatch


async def match_new_capability(article_id: int, ai_capability: str, db: Session):
    """When a new AI capability is discovered, match against all business contexts."""
    matches = search_matching_contexts(ai_capability, threshold=0.25)

    for match in matches:
        # Use strong model to analyze the opportunity
        prompt_result = await call_llm(
            task="match_opportunity",
            messages=[
                {
                    "role": "user",
                    "content": MATCH_OPPORTUNITY.format(
                        ai_capability=ai_capability,
                        business_context=match["document"],
                    ),
                }
            ],
            temperature=0.5,
        )

        try:
            analysis = json.loads(prompt_result)
        except json.JSONDecodeError:
            analysis = {"relevance_score": 0, "opportunity": prompt_result}

        relevance = analysis.get("relevance_score", 0)
        if relevance >= 50:  # Only store meaningful matches
            opp = OpportunityMatch(
                user_id=match["user_id"],
                article_id=article_id,
                business_context_id=int(match["context_id"]),
                ai_capability=ai_capability,
                business_need=match["document"][:500],
                opportunity_analysis=json.dumps(analysis, ensure_ascii=False),
                similarity_score=match["similarity"],
            )
            db.add(opp)

            # Push notification via Feishu
            from app.feishu.bot import push_opportunity_notification
            await push_opportunity_notification(match["user_id"], analysis)

    db.commit()
