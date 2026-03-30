from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean

from app.db.database import Base


class DigestArticle(Base):
    __tablename__ = "digest_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(1000))
    source = Column(String(100))
    category = Column(String(50))  # model_update, tool_release, research, industry
    summary = Column(Text)
    summary_zh = Column(Text)  # Chinese translation of summary
    ai_capability = Column(Text)  # extracted AI capability description for L3 matching
    importance = Column(Integer, default=3)  # 1-5
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class ToolInfo(Base):
    __tablename__ = "tool_info"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text)
    category = Column(String(100))
    features = Column(Text)  # JSON array
    getting_started_url = Column(String(1000))
    similar_tools = Column(Text)  # JSON array
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BusinessContext(Base):
    __tablename__ = "business_context"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    extracted_context = Column(Text)  # LLM-extracted structured business context
    source_type = Column(String(50))  # document, conversation
    created_at = Column(DateTime, default=datetime.utcnow)


class OpportunityMatch(Base):
    __tablename__ = "opportunity_matches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False)
    article_id = Column(Integer)
    business_context_id = Column(Integer)
    ai_capability = Column(Text)
    business_need = Column(Text)
    opportunity_analysis = Column(Text)
    similarity_score = Column(Float)
    status = Column(String(20), default="new")  # new, viewed, acted
    created_at = Column(DateTime, default=datetime.utcnow)


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False)
    item_type = Column(String(50), nullable=False)  # article, tool, opportunity
    item_id = Column(Integer, nullable=False)
    note = Column(Text)  # user's note on why they saved this
    created_at = Column(DateTime, default=datetime.utcnow)
