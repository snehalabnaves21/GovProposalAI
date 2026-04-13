"""
Database configuration for GovProposal AI.

Uses SQLAlchemy async engine with aiosqlite (easily swappable to PostgreSQL).
"""

import os
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# Ensure data directory exists
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{DATA_DIR / 'govproposal.db'}",
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    # For SQLite: allow same connection across threads (safe with async)
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
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
    """
    FastAPI dependency that yields an async database session.

    Usage:
        @app.get("/endpoint")
        async def handler(db: AsyncSession = Depends(get_db)):
            ...
    """
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
