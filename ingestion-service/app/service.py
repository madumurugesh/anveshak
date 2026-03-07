"""Core business logic for the ingestion pipeline."""

import logging
from app.database import get_pool
from app.aws_clients import check_and_set_dedup, push_to_kinesis
from app.schemas import IVRWebhookRequest

logger = logging.getLogger(__name__)


async def verify_beneficiary(phone_hash: str) -> bool:
    """Check if phone_hash exists in the RDS beneficiaries table."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT 1 FROM beneficiaries WHERE phone_hash = $1 LIMIT 1",
            phone_hash,
        )
        return row is not None


async def process_ivr_payload(payload: IVRWebhookRequest) -> dict:
    """Validate → deduplicate → stream.  Returns a result dict."""

    # 1. Verify beneficiary in RDS
    if not await verify_beneficiary(payload.phone_hash):
        return {"status": "rejected", "message": "Unknown beneficiary"}

    # 2. Deduplication via DynamoDB (one response per citizen per scheme per day)
    is_first = await check_and_set_dedup(payload.phone_hash, payload.scheme_id)
    if not is_first:
        return {"status": "duplicate", "message": "Already responded today for this scheme"}

    # 3. Push validated payload to Kinesis
    record = payload.model_dump()
    kinesis_resp = await push_to_kinesis(record)
    seq = kinesis_resp.get("SequenceNumber")

    logger.info("Streamed record seq=%s phone_hash=%s scheme=%s", seq, payload.phone_hash, payload.scheme_id)
    return {"status": "accepted", "message": "Response recorded", "kinesis_sequence": seq}
