const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const logger = require("../config/logger");
const { validateEngineSecret, validateQuery } = require("../middleware/validate");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/schemes
// All schemes with current performance metrics
// ─────────────────────────────────────────────────────────────
router.get(
  "/",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date } = req.query;
    const params = [];
    let dateCond;

    if (start_date && end_date) {
      params.push(start_date, end_date);
      dateCond = (col) => `${col} >= $1 AND ${col} <= $2`;
    } else {
      params.push(days || 7);
      dateCond = (col) => `${col} >= CURRENT_DATE - ($1 || ' days')::INTERVAL`;
    }

    const { rows } = await pool.query(
      `SELECT
         sc.scheme_id,
         sc.scheme_name_en,
         sc.scheme_name_ta,
         sc.is_active,
         sc.distribution_day_start,
         sc.distribution_day_end,
         sc.min_expected_response_rate,
         COALESCE(dr_stats.total_responses, 0)      AS total_responses,
         COALESCE(dr_stats.total_yes, 0)             AS total_yes,
         COALESCE(dr_stats.total_no, 0)              AS total_no,
         dr_stats.avg_no_pct,
         dr_stats.avg_response_rate,
         dr_stats.reporting_districts,
         dr_stats.reporting_pincodes,
         COALESCE(anom_stats.anomaly_count, 0)       AS anomaly_count,
         COALESCE(anom_stats.critical_count, 0)      AS critical_anomalies,
         COALESCE(anom_stats.resolved_count, 0)      AS resolved_anomalies,
         COALESCE(ben_stats.total_beneficiaries, 0)  AS total_beneficiaries,
         COALESCE(ben_stats.active_beneficiaries, 0) AS active_beneficiaries
       FROM scheme_config sc
       LEFT JOIN LATERAL (
         SELECT
           SUM(total_responses) AS total_responses,
           SUM(yes_count) AS total_yes,
           SUM(no_count)  AS total_no,
           ROUND(AVG(no_pct)::NUMERIC, 4)       AS avg_no_pct,
           ROUND(AVG(response_rate)::NUMERIC, 4) AS avg_response_rate,
           COUNT(DISTINCT district) AS reporting_districts,
           COUNT(DISTINCT pincode)  AS reporting_pincodes
         FROM daily_responses
         WHERE scheme_id = sc.scheme_id AND ${dateCond("date")}
       ) dr_stats ON true
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) AS anomaly_count,
           COUNT(*) FILTER (WHERE severity = 'CRITICAL') AS critical_count,
           COUNT(*) FILTER (WHERE status = 'RESOLVED')   AS resolved_count
         FROM anomaly_records
         WHERE scheme_id = sc.scheme_id AND ${dateCond("date")}
       ) anom_stats ON true
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) AS total_beneficiaries,
           COUNT(*) FILTER (WHERE is_active) AS active_beneficiaries
         FROM beneficiaries
         WHERE scheme_id = sc.scheme_id
       ) ben_stats ON true
       ORDER BY sc.scheme_id`,
      params
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  })
);

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/schemes/:schemeId
// Single scheme detail with district-level breakdown
// ─────────────────────────────────────────────────────────────
router.get(
  "/:schemeId",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { schemeId } = req.params;
    const { days, start_date, end_date } = req.query;
    const params = [schemeId];
    let dateCond;

    if (start_date && end_date) {
      params.push(start_date, end_date);
      dateCond = (col) => `${col} >= $2 AND ${col} <= $3`;
    } else {
      params.push(days || 7);
      dateCond = (col) => `${col} >= CURRENT_DATE - ($2 || ' days')::INTERVAL`;
    }

    // Scheme config
    const configResult = await pool.query(
      `SELECT * FROM scheme_config WHERE scheme_id = $1`,
      [schemeId]
    );
    if (configResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Scheme not found" });
    }

    const [districtBreakdown, trends, topAnomalies] = await Promise.all([
      // District-level breakdown
      pool.query(
        `SELECT
           district,
           SUM(total_responses) AS total_responses,
           SUM(yes_count)       AS yes_count,
           SUM(no_count)        AS no_count,
           ROUND(AVG(no_pct)::NUMERIC, 4)        AS avg_no_pct,
           ROUND(AVG(response_rate)::NUMERIC, 4)  AS avg_response_rate,
           COUNT(DISTINCT pincode) AS pincodes
         FROM daily_responses
         WHERE scheme_id = $1 AND ${dateCond("date")}
         GROUP BY district
         ORDER BY avg_no_pct DESC`,
        params
      ),

      // Daily trends for this scheme
      pool.query(
        `SELECT
           date,
           SUM(total_responses) AS total_responses,
           SUM(no_count)        AS no_count,
           ROUND(AVG(no_pct)::NUMERIC, 4) AS avg_no_pct
         FROM daily_responses
         WHERE scheme_id = $1 AND ${dateCond("date")}
         GROUP BY date
         ORDER BY date`,
        params
      ),

      // Top anomalies for this scheme
      pool.query(
        `SELECT
           id, date, detector_type, level, severity,
           district, pincode, block,
           score, no_pct, ai_classification, status
         FROM anomaly_records
         WHERE scheme_id = $1 AND ${dateCond("date")}
         ORDER BY
           CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
           date DESC
         LIMIT 20`,
        params
      ),
    ]);

    return res.json({
      success: true,
      data: {
        config:             configResult.rows[0],
        district_breakdown: districtBreakdown.rows,
        daily_trends:       trends.rows,
        top_anomalies:      topAnomalies.rows,
      },
    });
  })
);

module.exports = router;
