"""Background workers: Kinesis consumer + hourly flush to RDS."""

import asyncio
import json
import logging
import math
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
                        response_value=payload["response_value"],
                    )
                    logger.debug("Aggregated record: %s", payload)
                except Exception:
                    logger.exception("Failed to process Kinesis record")
            next_iterators.append(next_it)
        iterators = next_iterators
        await asyncio.sleep(1)  # poll interval


# ── Hourly flush: compute metrics → write to RDS ───────────────
def _compute_metrics(items: list[dict]) -> list[dict]:
    """Derive no_pct and z_score for each pincode/scheme bucket.

    no_pct  = (total_count - response_sum) / total_count * 100
              Interpretation: lower response_sum → higher "no" percentage.
    z_score = (x - mean) / std   where x = no_pct across all buckets.
    """
    rows: list[dict] = []
    for item in items:
        pk_parts = item["pk"].split("#")  # pincode#scheme_id#date
        total = int(item.get("total_count", 0))
        resp_sum = int(item.get("response_sum", 0))
        if total == 0:
            continue
        no_pct = ((total - resp_sum) / total) * 100
        rows.append({
            "pincode": pk_parts[0],
            "scheme_id": pk_parts[1],
            "report_date": pk_parts[2],
            "total_count": total,
            "response_sum": resp_sum,
            "no_pct": round(no_pct, 4),
        })

    # z-score across all buckets
    if rows:
        values = [r["no_pct"] for r in rows]
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values) if len(values) > 1 else 0
        std = math.sqrt(variance) if variance else 1.0
        for r in rows:
            r["z_score"] = round((r["no_pct"] - mean) / std, 4)
    return rows


async def flush_to_rds():
    """Read today's DynamoDB aggregates, compute metrics, upsert into RDS daily_responses."""
    logger.info("Hourly flush: reading DynamoDB aggregates …")
    items = await scan_today_aggregates()
    if not items:
        logger.info("No aggregates to flush.")
        return

    rows = _compute_metrics(items)
    pool = await get_pool()

    async with pool.acquire() as conn:
        for r in rows:
            await conn.execute(
                """
                INSERT INTO daily_responses
                    (pincode, scheme_id, report_date, total_count, response_sum, no_pct, z_score)
                VALUES ($1, $2, $3::date, $4, $5, $6, $7)
                ON CONFLICT (pincode, scheme_id, report_date)
                DO UPDATE SET
                    total_count  = EXCLUDED.total_count,
                    response_sum = EXCLUDED.response_sum,
                    no_pct       = EXCLUDED.no_pct,
                    z_score      = EXCLUDED.z_score
                """,
                r["pincode"],
                r["scheme_id"],
                r["report_date"],
                r["total_count"],
                r["response_sum"],
                r["no_pct"],
                r["z_score"],
            )
    logger.info("Flushed %d rows to daily_responses.", len(rows))


async def periodic_flush():
    """Run flush_to_rds every WINDOW_SECONDS (default 3600 s)."""
    s = get_settings()
    while True:
        await asyncio.sleep(s.window_seconds)
        try:
            await flush_to_rds()
        except Exception:
            logger.exception("flush_to_rds failed")
