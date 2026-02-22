import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client, get_current_collector
from app.models.client import Client
from app.models.collector import Collector
from app.schemas.transaction import (
    ClientSMSSubmitRequest,
    ClientTransactionItem,
    ConfirmRequest,
    ParsedSMSResponse,
    QueryRequest,
    RejectRequest,
    SMSSubmitRequest,
    SubmitResponse,
    TransactionActionResponse,
    TransactionFeedItem,
)
from app.services.image_service import ImageValidationError, upload_screenshot
from app.services.rate_limiter import check_submission_rate_limit, increment_submission_count
from app.services.transaction_service import (
    confirm_transaction,
    get_client_history,
    get_collector_transactions,
    get_pending_feed,
    query_transaction,
    reject_transaction,
    submit_screenshot,
    submit_screenshot_as_client,
    submit_sms,
    submit_sms_as_client,
)
from app.workers.tasks import (
    notify_duplicate_task,
    notify_payment_confirmed_task,
    notify_payment_queried_task,
    notify_payment_submitted_task,
)

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


# --- Client Submission Endpoints ---


@router.post("/submit/sms", response_model=SubmitResponse)
async def submit_sms_endpoint(
    body: SMSSubmitRequest,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Client submits payment proof by pasting MTN MoMo SMS text."""
    # Rate limit
    if not await check_submission_rate_limit(body.client_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Submission rate limit exceeded. Maximum 5 per hour.",
        )

    try:
        txn, parsed, validation = await submit_sms(db, collector, body.client_id, body.sms_text)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await increment_submission_count(body.client_id)

    # Dispatch async notifications
    if txn.status == "AUTO_REJECTED":
        # Notify client about duplicate
        client_obj = await db.get(Client, body.client_id)
        if client_obj:
            notify_duplicate_task.delay(client_obj.push_token, client_obj.phone)
    elif txn.status == "PENDING":
        # Notify collector about new submission
        notify_payment_submitted_task.delay(
            collector.push_token,
            collector.phone,
            (await db.get(Client, body.client_id)).full_name,
            float(txn.amount),
        )

    return SubmitResponse(
        transaction_id=txn.id,
        status=txn.status,
        trust_level=txn.trust_level,
        validation_flags=txn.validation_flags,
        parsed=ParsedSMSResponse(
            amount=parsed.amount,
            recipient_name=parsed.recipient_name,
            recipient_phone=parsed.recipient_phone,
            transaction_id=parsed.transaction_id,
            transaction_date=parsed.transaction_date,
            confidence=parsed.confidence,
        ),
    )


@router.post("/submit/screenshot", response_model=SubmitResponse)
async def submit_screenshot_endpoint(
    client_id: uuid.UUID = Form(...),
    amount: float = Form(..., gt=0),
    screenshot: UploadFile = File(...),
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Client submits payment proof by uploading a screenshot (LOW trust)."""
    if not await check_submission_rate_limit(client_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Submission rate limit exceeded. Maximum 5 per hour.",
        )

    # Upload screenshot to S3
    screenshot_key = None
    content = await screenshot.read()
    try:
        screenshot_key = await upload_screenshot(
            content, screenshot.content_type, collector.id, client_id
        )
    except ImageValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    try:
        txn = await submit_screenshot(db, collector, client_id, amount, screenshot_key)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await increment_submission_count(client_id)

    # Notify collector about new submission
    client_obj = await db.get(Client, client_id)
    if client_obj:
        notify_payment_submitted_task.delay(
            collector.push_token,
            collector.phone,
            client_obj.full_name,
            float(txn.amount),
        )

    return SubmitResponse(
        transaction_id=txn.id,
        status=txn.status,
        trust_level=txn.trust_level,
    )


# --- Collector Feed & Actions ---


@router.get("/feed", response_model=list[TransactionFeedItem])
async def get_feed(
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Get pending transactions for the collector to review."""
    items = await get_pending_feed(db, collector.id)
    return items


@router.get("", response_model=list[TransactionFeedItem])
async def list_transactions(
    status_filter: str | None = Query(None, alias="status"),
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """List all transactions for collector, optionally filtered by status."""
    items = await get_collector_transactions(db, collector.id, status_filter)
    return items


@router.post("/{txn_id}/confirm", response_model=TransactionActionResponse)
async def confirm(
    txn_id: str,
    body: ConfirmRequest,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Collector confirms a pending or queried transaction."""
    try:
        txn = await confirm_transaction(db, txn_id, collector.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify client about confirmation
    client_obj = await db.get(Client, txn.client_id)
    if client_obj:
        from app.services.balance_service import get_client_balance

        balance_info = await get_client_balance(db, client_obj.id)
        notify_payment_confirmed_task.delay(
            client_obj.push_token,
            client_obj.phone,
            float(txn.amount),
            float(balance_info["balance"]),
        )

    return TransactionActionResponse(
        transaction_id=txn.id,
        status=txn.status,
        confirmed_at=txn.confirmed_at,
    )


@router.post("/{txn_id}/query", response_model=TransactionActionResponse)
async def query(
    txn_id: str,
    body: QueryRequest,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Collector queries a pending transaction with a note."""
    try:
        txn = await query_transaction(db, txn_id, collector.id, body.note)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify client about query
    client_obj = await db.get(Client, txn.client_id)
    if client_obj:
        notify_payment_queried_task.delay(
            client_obj.push_token, client_obj.phone, body.note
        )

    return TransactionActionResponse(
        transaction_id=txn.id,
        status=txn.status,
    )


@router.post("/{txn_id}/reject", response_model=TransactionActionResponse)
async def reject(
    txn_id: str,
    body: RejectRequest,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Collector rejects a queried transaction."""
    try:
        txn = await reject_transaction(db, txn_id, collector.id, body.note)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return TransactionActionResponse(
        transaction_id=txn.id,
        status=txn.status,
    )


# --- Client Self-Submission Endpoints ---


@router.post("/client/submit/sms", response_model=SubmitResponse)
async def client_submit_sms_endpoint(
    body: ClientSMSSubmitRequest,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Client submits their own payment proof by pasting MTN MoMo SMS text."""
    if not await check_submission_rate_limit(client.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Submission rate limit exceeded. Maximum 5 per hour.",
        )

    try:
        txn, parsed, validation = await submit_sms_as_client(db, client, body.sms_text)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await increment_submission_count(client.id)

    # Dispatch async notifications
    if txn.status == "AUTO_REJECTED":
        notify_duplicate_task.delay(client.push_token, client.phone)
    elif txn.status == "PENDING":
        # Notify collector about new submission
        collector_obj = await db.get(Collector, client.collector_id)
        if collector_obj:
            notify_payment_submitted_task.delay(
                collector_obj.push_token,
                collector_obj.phone,
                client.full_name,
                float(txn.amount),
            )

    return SubmitResponse(
        transaction_id=txn.id,
        status=txn.status,
        trust_level=txn.trust_level,
        validation_flags=txn.validation_flags,
        parsed=ParsedSMSResponse(
            amount=parsed.amount,
            recipient_name=parsed.recipient_name,
            recipient_phone=parsed.recipient_phone,
            transaction_id=parsed.transaction_id,
            transaction_date=parsed.transaction_date,
            confidence=parsed.confidence,
        ),
    )


@router.post("/client/submit/screenshot", response_model=SubmitResponse)
async def client_submit_screenshot_endpoint(
    amount: float = Form(..., gt=0),
    screenshot: UploadFile = File(...),
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Client submits their own payment proof by uploading a screenshot (LOW trust)."""
    if not await check_submission_rate_limit(client.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Submission rate limit exceeded. Maximum 5 per hour.",
        )

    # Upload screenshot to S3
    screenshot_key = None
    content = await screenshot.read()
    try:
        screenshot_key = await upload_screenshot(
            content, screenshot.content_type, client.collector_id, client.id
        )
    except ImageValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    try:
        txn = await submit_screenshot_as_client(db, client, amount, screenshot_key)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await increment_submission_count(client.id)

    # Notify collector about new submission
    collector_obj = await db.get(Collector, client.collector_id)
    if collector_obj:
        notify_payment_submitted_task.delay(
            collector_obj.push_token,
            collector_obj.phone,
            client.full_name,
            float(txn.amount),
        )

    return SubmitResponse(
        transaction_id=txn.id,
        status=txn.status,
        trust_level=txn.trust_level,
    )


# --- Client History ---


@router.get("/my-history", response_model=list[ClientTransactionItem])
async def my_history(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Client views their own transaction history (excludes AUTO_REJECTED)."""
    txns = await get_client_history(db, client.id)
    return txns
