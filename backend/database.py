"""
Database configuration for GovProposal AI.
Uses Supabase PostgreSQL (persistent) instead of SQLite.
"""

import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Add it to your Render environment variables.")

# Supabase/Render provide postgres:// — SQLAlchemy async needs postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all database tables (called on app startup)."""
    async with engine.begin() as conn:
        from db_models import (  # noqa: F401
            User, VendorProfileDB, Proposal, Subscription, ProposalShare, AuditLog,
            NAICSCode, ComplianceRequirement, NAICSComplianceMap, Agency,
            ContractVehicle, NAICSContractMap, ContractComplianceMap, Company,
            CompanyNAICS, CompanyCompliance, Opportunity, ProposalComplianceCheck,
            AIRule, AIRecommendation, N8NWorkflowRun,
        )
        await conn.run_sync(Base.metadata.create_all)