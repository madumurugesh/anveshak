const express = require("express");
const router = express.Router();
const { classifyAnomaly, classifyBatch } = require("../services/openaiService");
const { validateAnomaly, validateBatch, validateEngineSecret } = require("../middleware/validate");
const pool = require("../config/db");
const logger = require("../config/logger");

// Async handler wrapper — catches thrown errors and forwards to Express error MW
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/anomaly/classify
// Classify a single anomaly record
router.post(
  "/classify",
  validateEngineSecret,
  validateAnomaly,
  asyncHandler(async (req, res) => {
    const anomaly = req.body;
    logger.info("classify request received", {
      request_id: req.id,
      anomaly_id: anomaly.id,
      detector_type: anomaly.detector_type,
      severity: anomaly.severity,
      scheme_id: anomaly.scheme_id,
    });

    const result = await classifyAnomaly(anomaly);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        anomaly_id: result.anomaly_id,
        error: result.error,
      });
    }

    return res.status(200).json(result);
  })
);

// POST /api/anomaly/classify/batch
// Classify a batch of anomaly records (max BATCH_SIZE)
router.post(
  "/classify/batch",
  validateEngineSecret,
  validateBatch,
  asyncHandler(async (req, res) => {
    const { anomalies } = req.body;
    logger.info("batch classify request received", { request_id: req.id, count: anomalies.length });

    const results = await classifyBatch(anomalies);

    const succeeded = results.filter((r) => r.success).length;
    const failed    = results.filter((r) => !r.success).length;

    return res.status(200).json({
      success: true,
      summary: { total: results.length, succeeded, failed },
      results,
    });
  })
);

// POST /api/anomaly/classify/pending
// Pull all PENDING anomalies from DB and classify them
router.post(
  "/classify/pending",
  validateEngineSecret,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || parseInt(process.env.BATCH_SIZE || "5");

    let pendingRows;
    try {
      const { rows } = await pool.query(
        `SELECT
          id, date, detector_type, level, pincode, block, district, state,
          scheme_id, severity, score, no_pct, baseline_no_pct,
          total_responses, affected_beneficiaries, raw_data
        FROM anomaly_records
        WHERE ai_classification IS NULL
           OR ai_classification = 'PENDING'
        ORDER BY
          CASE severity
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH'     THEN 2
            WHEN 'MEDIUM'   THEN 3
            WHEN 'LOW'      THEN 4
          END,
          created_at DESC
        LIMIT $1`,
        [limit]
      );
      pendingRows = rows;
    } catch (dbErr) {
      logger.error("Failed to fetch pending anomalies", { error: dbErr.message });
      return res.status(500).json({ success: false, error: "DB query failed" });
    }

    if (pendingRows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending anomalies found",
        summary: { total: 0, succeeded: 0, failed: 0 },
        results: [],
      });
    }

    logger.info("Processing pending anomalies", { count: pendingRows.length });
    const results = await classifyBatch(pendingRows);

    const succeeded = results.filter((r) => r.success).length;
    const failed    = results.filter((r) => !r.success).length;

    return res.status(200).json({
      success: true,
      summary: { total: results.length, succeeded, failed },
      results,
    });
  })
);

// GET /api/anomaly/:id/result
// Fetch the AI result for a classified anomaly
router.get("/:id/result", validateEngineSecret, asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT
        id, date, detector_type, scheme_id, severity,
        ai_classification, ai_confidence, ai_reasoning,
        ai_action, ai_action_ta, ai_urgency, ai_processed_at, status
      FROM anomaly_records
      WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Anomaly not found" });
    }
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (dbErr) {
    return res.status(500).json({ success: false, error: dbErr.message });
  }
}));

// GET /api/anomaly/stats
// AI processing stats — useful for dashboard and cost tracking
router.get("/stats", validateEngineSecret, asyncHandler(async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total_anomalies,
        COUNT(*) FILTER (WHERE ai_classification IS NOT NULL
          AND ai_classification != 'PENDING')            AS classified,
        COUNT(*) FILTER (WHERE ai_classification IS NULL
          OR ai_classification = 'PENDING')              AS pending,
        COUNT(*) FILTER (WHERE ai_classification = 'SUPPLY_FAILURE')   AS supply_failure,
        COUNT(*) FILTER (WHERE ai_classification = 'DEMAND_COLLAPSE')  AS demand_collapse,
        COUNT(*) FILTER (WHERE ai_classification = 'FRAUD_PATTERN')    AS fraud_pattern,
        COUNT(*) FILTER (WHERE ai_classification = 'DATA_ARTIFACT')    AS data_artifact,
        ROUND(AVG(ai_confidence)::NUMERIC, 3)            AS avg_confidence
      FROM anomaly_records
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `);

    const { rows: costRows } = await pool.query(`
      SELECT
        COALESCE(SUM(cost_usd), 0)          AS total_cost_usd,
        COALESCE(SUM(total_tokens), 0)      AS total_tokens,
        COUNT(*)                            AS total_calls,
        COUNT(*) FILTER (WHERE success)     AS successful_calls,
        ROUND(AVG(latency_ms))              AS avg_latency_ms
      FROM ai_prompt_log
      WHERE called_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    return res.status(200).json({
      success: true,
      window: "last_7_days",
      anomalies: rows[0],
      openai_usage: costRows[0],
    });
  } catch (dbErr) {
    return res.status(500).json({ success: false, error: dbErr.message });
  }
}));

module.exports = router;