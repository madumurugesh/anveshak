"""Anomaly detectors: NO_SPIKE, SILENCE, DISTRICT_ROLLUP.

Reads today's daily_responses, compares against district_baselines,
and inserts anomaly_records for the AI engine to classify.
"""

import json
import logging
from datetime import date

import httpx

from app.database import get_pool
from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Detector thresholds ─────────────────────────────────────────
NO_SPIKE_CRITICAL = 3.0
NO_SPIKE_HIGH = 2.0
NO_SPIKE_MEDIUM = 1.5
MIN_RESPONSES_FOR_SPIKE = 5

SILENCE_HIGH = 0.60
SILENCE_MEDIUM = 0.40

DISTRICT_ROLLUP_NO_PCT = 0.40
DISTRICT_ROLLUP_MIN_BLOCKS = 3


def _severity_from_zscore(z: float) -> str | None:
    if z >= NO_SPIKE_CRITICAL:
        return "CRITICAL"
    if z >= NO_SPIKE_HIGH:
        return "HIGH"
    if z >= NO_SPIKE_MEDIUM:
        return "MEDIUM"
    return None


# ── NO_SPIKE detector ──────────────────────────────────────────
async def detect_no_spike(conn, today_rows: list[dict]) -> int:
    """Flag pincodes where no_pct deviates significantly from baseline."""
    count = 0
    for row in today_rows:
        if row["total_responses"] < MIN_RESPONSES_FOR_SPIKE:
            continue
        if row["no_pct"] is None:
            continue

        # Try block-level baseline first, then district-level
        baseline = await conn.fetchrow(
            """SELECT avg_no_pct, std_dev_no_pct
               FROM district_baselines
               WHERE district = $1 AND scheme_id = $2
                 AND (block = $3 OR block IS NULL)
               ORDER BY block NULLS LAST, computed_date DESC
               LIMIT 1""",
            row["district"], row["scheme_id"], row["block"],
        )

        # Fallback: compute mean/stddev from today's data for same scheme
        if not baseline or not baseline["std_dev_no_pct"] or float(baseline["std_dev_no_pct"]) == 0:
            fallback = await conn.fetchrow(
                """SELECT AVG(no_pct) AS avg_no_pct,
                          STDDEV_POP(no_pct) AS std_dev_no_pct
                   FROM daily_responses
                   WHERE date = $1::date AND scheme_id = $2
                     AND total_responses >= $3""",
                str(date.today()), row["scheme_id"], MIN_RESPONSES_FOR_SPIKE,
            )
            if not fallback or not fallback["std_dev_no_pct"] or float(fallback["std_dev_no_pct"]) == 0:
                continue
            baseline = fallback

        avg = float(baseline["avg_no_pct"])
        std = float(baseline["std_dev_no_pct"])
        z_score = (float(row["no_pct"]) - avg) / std

        severity = _severity_from_zscore(z_score)
        if not severity:
            continue

        # Active beneficiary count
        ben_count = await conn.fetchval(
            "SELECT COUNT(*) FROM beneficiaries "
            "WHERE pincode = $1 AND scheme_id = $2 AND is_active = TRUE",
            row["pincode"], row["scheme_id"],
        )

        await conn.execute(
            """INSERT INTO anomaly_records
                   (date, detector_type, level, pincode, block, district, state,
                    scheme_id, severity, score, no_pct, baseline_no_pct,
                    total_responses, affected_beneficiaries, raw_data)
               VALUES ($1, 'NO_SPIKE', 'PINCODE', $2, $3, $4, $5,
                       $6, $7, $8, $9, $10, $11, $12, $13::jsonb)""",
            row["date"], row["pincode"], row["block"], row["district"], row["state"],
            row["scheme_id"], severity, round(z_score, 4), row["no_pct"],
            round(avg, 4), row["total_responses"], ben_count or 0,
            json.dumps({
                "source": "daily_responses",
                "yes_count": row["yes_count"],
                "no_count": row["no_count"],
            }),
        )
        count += 1
        logger.info("NO_SPIKE %s pin=%s scheme=%s z=%.2f sev=%s",
                     row["date"], row["pincode"], row["scheme_id"], z_score, severity)
    return count


# ── SILENCE detector ────────────────────────────────────────────
async def detect_silence(conn, today_rows: list[dict]) -> int:
    """Flag pincodes with unusually low response counts relative to beneficiary base."""
    count = 0
    for row in today_rows:
        ben_count = await conn.fetchval(
            "SELECT COUNT(*) FROM beneficiaries "
            "WHERE pincode = $1 AND scheme_id = $2 AND is_active = TRUE",
            row["pincode"], row["scheme_id"],
        )
        if not ben_count or ben_count == 0:
            continue

        # Get scheme's expected response rate
        rate = await conn.fetchval(
            "SELECT min_expected_response_rate FROM scheme_config WHERE scheme_id = $1",
            row["scheme_id"],
        )
        rate = float(rate) if rate else 0.15  # fallback 15%

        expected = ben_count * rate
        if expected <= 0:
            continue

        silence_ratio = 1.0 - (row["total_responses"] / expected)
        if silence_ratio < SILENCE_MEDIUM:
            continue

        severity = "HIGH" if silence_ratio >= SILENCE_HIGH else "MEDIUM"

        await conn.execute(
            """INSERT INTO anomaly_records
                   (date, detector_type, level, pincode, block, district, state,
                    scheme_id, severity, score, no_pct, baseline_no_pct,
                    total_responses, affected_beneficiaries, raw_data)
               VALUES ($1, 'SILENCE', 'PINCODE', $2, $3, $4, $5,
                       $6, $7, $8, $9, NULL, $10, $11, $12::jsonb)""",
            row["date"], row["pincode"], row["block"], row["district"], row["state"],
            row["scheme_id"], severity, round(silence_ratio, 4), row["no_pct"],
            row["total_responses"], ben_count,
            json.dumps({
                "expected_responses": round(expected, 2),
                "actual_responses": row["total_responses"],
                "silence_ratio": round(silence_ratio, 4),
            }),
        )
        count += 1
        logger.info("SILENCE %s pin=%s scheme=%s ratio=%.2f sev=%s",
                     row["date"], row["pincode"], row["scheme_id"], silence_ratio, severity)
    return count


# ── DISTRICT_ROLLUP detector ───────────────────────────────────
async def detect_district_rollup(conn, today_rows: list[dict]) -> int:
    """Flag districts where >= 3 blocks exceed NO% threshold simultaneously."""
    count = 0

    # Group by (district, scheme_id, date) → rows exceeding threshold
    groups: dict[tuple, list[dict]] = {}
    for row in today_rows:
        if row["no_pct"] is None or float(row["no_pct"]) < DISTRICT_ROLLUP_NO_PCT:
            continue
        if not row["block"] or not row["district"]:
            continue
        key = (row["district"], row["scheme_id"], str(row["date"]))
        groups.setdefault(key, []).append(row)

    for (district, scheme_id, report_date), flagged in groups.items():
        blocks = set(r["block"] for r in flagged)
        if len(blocks) < DISTRICT_ROLLUP_MIN_BLOCKS:
            continue

        avg_no_pct = sum(float(r["no_pct"]) for r in flagged) / len(flagged)
        total_resp = sum(r["total_responses"] for r in flagged)
        total_affected = sum(r.get("active_beneficiaries") or 0 for r in flagged)
        state_val = flagged[0].get("state")

        # Look up district-level baseline
        baseline = await conn.fetchrow(
            """SELECT avg_no_pct FROM district_baselines
               WHERE district = $1 AND scheme_id = $2 AND block IS NULL
               ORDER BY computed_date DESC LIMIT 1""",
            district, scheme_id,
        )
        baseline_val = round(float(baseline["avg_no_pct"]), 4) if baseline else None

        await conn.execute(
            """INSERT INTO anomaly_records
                   (date, detector_type, level, pincode, block, district, state,
                    scheme_id, severity, score, no_pct, baseline_no_pct,
                    total_responses, affected_beneficiaries, raw_data)
               VALUES ($1::date, 'DISTRICT_ROLLUP', 'DISTRICT', NULL, NULL, $2, $3,
                       $4, 'HIGH', $5, $6, $7, $8, $9, $10::jsonb)""",
            report_date, district, state_val,
            scheme_id, round(avg_no_pct, 4), round(avg_no_pct, 4), baseline_val,
            total_resp, total_affected,
            json.dumps({"blocks_flagged": sorted(blocks), "block_count": len(blocks)}),
        )
        count += 1
        logger.info("DISTRICT_ROLLUP %s dist=%s scheme=%s blocks=%d avg_no=%.2f",
                     report_date, district, scheme_id, len(blocks), avg_no_pct)
    return count


# ── Trigger AI classification ──────────────────────────────────
async def notify_anomaly_engine():
    """Call the AI anomaly engine to classify pending records (if configured)."""
    s = get_settings()
    if not s.anomaly_engine_url:
        logger.debug("anomaly_engine_url not set — skipping AI classification trigger.")
        return

    url = f"{s.anomaly_engine_url}/api/anomaly/classify/pending"
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                url,
                headers={"X-Engine-Secret": s.engine_secret},
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("Anomaly engine responded: %s", data.get("summary"))
    except Exception:
        logger.exception("Failed to notify anomaly engine")


# ── Main entry point ───────────────────────────────────────────
async def run_detectors():
    """Run all detectors on today's daily_responses, then optionally trigger AI classification."""
    logger.info("Running anomaly detectors …")
    pool = await get_pool()
    today_str = date.today().isoformat()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, date, pincode, scheme_id, block, district, state,
                      yes_count, no_count, total_responses, no_pct,
                      active_beneficiaries, response_rate
               FROM daily_responses WHERE date = $1::date""",
            today_str,
        )
        if not rows:
            logger.info("No daily_responses for %s — skipping detection.", today_str)
            return

        today_rows = [dict(r) for r in rows]

        spike_count = await detect_no_spike(conn, today_rows)
        silence_count = await detect_silence(conn, today_rows)
        rollup_count = await detect_district_rollup(conn, today_rows)

    total = spike_count + silence_count + rollup_count
    logger.info("Detection complete: %d anomalies (spike=%d, silence=%d, rollup=%d)",
                total, spike_count, silence_count, rollup_count)

    if total > 0:
        await notify_anomaly_engine()
