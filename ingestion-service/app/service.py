"""Core business logic for the ingestion pipeline."""

import logging
from app.database import get_pool
from app.aws_clients import check_and_set_dedup, push_to_kinesis
from app.schemas import IVRWebhookRequest

logger = logging.getLogger(__name__)

RESPONSE_MAP = {1: "YES", 2: "NO"}


async def lookup_beneficiary(phone_hash: str) -> dict | None:
    """Fetch beneficiary row from RDS including geo fields. Returns None if not found/inactive."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT phone_hash, scheme_id, pincode, block, district, state
               FROM beneficiaries
               WHERE phone_hash = $1 AND is_active = TRUE
               LIMIT 1""",
            phone_hash,
        )
        return dict(row) if row else None


async def process_ivr_payload(payload: IVRWebhookRequest) -> dict:
    """Validate → deduplicate → enrich → stream.  Returns a result dict."""

    # 1. Map IVR keypress to YES / NO
    response = RESPONSE_MAP.get(payload.response_value)
    if not response:
        return {"status": "rejected", "message": "Invalid response value"}

    # 2. Verify beneficiary in RDS and fetch geo data
    beneficiary = await lookup_beneficiary(payload.phone_hash)
    if not beneficiary:
        return {"status": "rejected", "message": "Unknown or inactive beneficiary"}

    # 3. Deduplication via DynamoDB (one response per citizen per scheme per day)
    is_first = await check_and_set_dedup(payload.phone_hash, payload.scheme_id)
    if not is_first:
        return {"status": "duplicate", "message": "Already responded today for this scheme"}

    # 4. Build enriched payload with geo data from beneficiary record
    record = {
        "phone_hash": payload.phone_hash,
        "scheme_id": payload.scheme_id,
        "pincode": payload.pincode,
        "response": response,
        "block": beneficiary.get("block"),
        "district": beneficiary.get("district"),
        "state": beneficiary.get("state"),
    }

    # 5. Push enriched payload to Kinesis
    kinesis_resp = await push_to_kinesis(record)
    seq = kinesis_resp.get("SequenceNumber")

    logger.info("Streamed seq=%s phone=%s scheme=%s resp=%s",
                seq, payload.phone_hash, payload.scheme_id, response)
    return {"status": "accepted", "message": "Response recorded", "kinesis_sequence": seq}
