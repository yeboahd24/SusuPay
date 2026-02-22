import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_collector
from app.models.collector import Collector
from app.schemas.report import ClientStatement, MonthlySummary
from app.services.report_service import (
    generate_pdf_report,
    get_client_statement,
    get_monthly_summary,
)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/monthly-summary", response_model=MonthlySummary)
async def monthly_summary(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Get monthly summary for the collector's group."""
    summary = await get_monthly_summary(db, collector.id, year, month)
    return summary


@router.get("/monthly-summary/pdf")
async def monthly_summary_pdf(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Download monthly summary as PDF."""
    pdf_bytes = await generate_pdf_report(db, collector.id, year, month)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=susupay-report-{year}-{month:02d}.pdf"
        },
    )


@router.get("/client-statement/{client_id}", response_model=ClientStatement)
async def client_statement(
    client_id: uuid.UUID,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Get per-client statement for a specific month."""
    try:
        statement = await get_client_statement(
            db, client_id, collector.id, year, month
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return statement
