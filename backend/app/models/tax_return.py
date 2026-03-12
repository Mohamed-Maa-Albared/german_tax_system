from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional

from app.database import Base
from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column


class TaxReturn(Base):
    """
    Optional: store anonymous calculation sessions so users can share/revisit results.
    No personally identifiable information is required.
    """

    __tablename__ = "tax_returns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)  # UUID
    tax_year: Mapped[int] = mapped_column(Integer, nullable=False)

    # Stored as JSON strings (avoids complex FK relationships for MVP)
    personal_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    income_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deduction_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Key result fields for quick queries / analytics
    zve: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_tax: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    refund_or_payment: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
