"""Background workers: Kinesis consumer + hourly flush to RDS + anomaly detection."""

import asyncio
import json
import logging
from datetime import date

from app.aws_clients import get_shard_iterators, get_records, increment_counter, scan_today_aggregates
from app.database import get_pool
from app.config import get_settings

logger = logging.getLogger(__name__)


# ── Kinesis consumer loop ───────────────────────────────────────
async def kinesis_consumer():
    """Continuously poll every shard and update DynamoDB counters."""
    logger.info("Kinesis consumer starting …")
    iterators = await get_shard_iterators()

    while True:
        next_iterators: list[str] = []
        for it in iterators:
            if it is None:
                continue
            records, next_it = await get_records(it)
            for rec in records:
                try:
                    payload = json.loads(rec["Data"])
                    await increment_counter(
                        pincode=payload["pincode"],
                        scheme_id=payload["scheme_id"],
                        response=payload["response"],
                        district=payload.get("district"),
                        block=payload.get("block"),
                        state=payload.get("state"),
                    )
                    logger.debug("Aggregated record: %s", payload)
                except Exception:
                    logger.exception("Failed to process Kinesis record")
            next_iterators.append(next_it)
        iterators = next_iterators
        await asyncio.sleep(1)  # poll interval


# ── Hourly flush: DynamoDB aggregates → RDS daily_responses ────────
def _build_rows(items: list[dict]) -> list[dict]:
    """Parse DynamoDB items into rows suitable for RDS upsert."""
    rows: list[dict] = []
    for item in items:
        pk_parts = item["pk"].split("#")  # pincode#scheme_id#YYYY-MM-DD
        if len(pk_parts) < 3:
            continue
        yes_count = int(item.get("yes_count", 0))
        no_count = int(item.get("no_count", 0))
        total = int(item.get("total", 0))
        if total == 0:
            continue
        no_pct = round(no_count / total, 4)  # decimal 0.0 – 1.0
        rows.append({
            "date": pk_parts[2],
            "pincode": pk_parts[0],
            "scheme_id": pk_parts[1],
            "block": item.get("block"),
            "district": item.get("district"),
            "state": item.get("state"),
            "yes_count": yes_count,
            "no_count": no_count,
            "total_responses": total,
            "no_pct": no_pct,
        })
    return rows


async def flush_to_rds():
    """Read today's DynamoDB aggregates, compute metrics, upsert into RDS daily_responses."""
    logger.info("Flush: reading DynamoDB aggregates …")
    items = await scan_today_aggregates()
    if not items:
        logger.info("No aggregates to flush.")
        return

    rows = _build_rows(items)
    pool = await get_pool()

    async with pool.acquire() as conn:
        for r in rows:
            # Count active beneficiaries for this pincode + scheme
            ben_count = await conn.fetchval(
                "SELECT COUNT(*) FROM beneficiaries "
                "WHERE pincode = $1 AND scheme_id = $2 AND is_active = TRUE",
                r["pincode"], r["scheme_id"],
            )
            response_rate = round(r["total_responses"] / ben_count, 4) if ben_count else None

            await conn.execute(
                """
                INSERT INTO daily_responses
                    (date, pincode, scheme_id, block, district, state,
                     yes_count, no_count, total_responses, no_pct,
                     active_beneficiaries, response_rate)
                VALUES ($1::date, $2, $3, $4, $5, $6,
                        $7, $8, $9, $10,
                        $11, $12)
                ON CONFLICT (pincode, scheme_id, date)
                DO UPDATE SET
                    yes_count            = EXCLUDED.yes_count,
                    no_count             = EXCLUDED.no_count,
                    total_responses      = EXCLUDED.total_responses,
                    no_pct               = EXCLUDED.no_pct,
                    active_beneficiaries = EXCLUDED.active_beneficiaries,
                    response_rate        = EXCLUDED.response_rate,
                    updated_at           = NOW()
                """,
                r["date"], r["pincode"], r["scheme_id"],
                r["block"], r["district"], r["state"],
                r["yes_count"], r["no_count"], r["total_responses"], r["no_pct"],
                ben_count, response_rate,
            )
    logger.info("Flushed %d rows to daily_responses.", len(rows))


async def periodic_flush():
    """Run flush + detect every WINDOW_SECONDS (default 3600 s)."""
    s = get_settings()
    while True:
        await asyncio.sleep(s.window_seconds)
        try:
            await flush_to_rds()
        except Exception:
            logger.exception("flush_to_rds failed")
        try:
            from app.detectors import run_detectors
            await run_detectors()
        except Exception:
            logger.exception("run_detectors failed")
