import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def send_sms(phone: str, message: str) -> bool:
    """
    Send SMS via Hubtel API.

    In development mode, logs the message instead of sending.
    Returns True if sent (or logged) successfully.
    """
    if settings.APP_ENV == "development" or not settings.HUBTEL_CLIENT_ID:
        logger.info("SMS to %s: %s", phone[-4:].rjust(10, "*"), message)
        return True

    # Production: Hubtel SMS API integration
    # TODO: Implement Hubtel API call in Phase 4
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://smsc.hubtel.com/v1/messages/send",
            auth=(settings.HUBTEL_CLIENT_ID, settings.HUBTEL_CLIENT_SECRET),
            json={
                "From": settings.HUBTEL_SMS_SENDER,
                "To": phone,
                "Content": message,
            },
        )
        if response.status_code == 200:
            return True
        logger.error("Hubtel SMS failed: %s %s", response.status_code, response.text)
        return False
