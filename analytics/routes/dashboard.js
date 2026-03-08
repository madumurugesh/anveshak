const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const logger = require("../config/logger");
const { validateEngineSecret, validateQuery } = require("../middleware/validate");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   - name: Dashboard
 *     description: Dashboard overview, trends, and district summary
 */

/**
 * @swagger
 * /api/analytics/dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Dashboard overview metrics
 *     description: Key metrics for the main dashboard cards — responses, anomalies, beneficiaries, and alert actions.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       200:
 *         description: Overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 window: { type: string, example: "last_7_days" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     responses:
 *                       type: object
 *                       properties:
 *                         total_responses: { type: string }
 *                         total_yes: { type: string }
 *                         total_no: { type: string }
 *                         districts_reporting: { type: string }
 *                         pincodes_reporting: { type: string }
 *                         avg_no_pct: { type: string }
 *                         avg_response_rate: { type: string }
 *                     anomalies:
 *                       type: object
 *                       properties:
 *                         total_anomalies: { type: string }
 *                         critical: { type: string }
 *                         high: { type: string }
 *                         medium: { type: string }
 *                         low: { type: string }
 *                         resolved: { type: string }
 *                         open: { type: string }
 *                         ai_classified: { type: string }
 *                         avg_ai_confidence: { type: string }
 *                     beneficiaries:
 *                       type: object
 *                       properties:
 *                         total_beneficiaries: { type: string }
 *                         active_beneficiaries: { type: string }
 *                         schemes_count: { type: string }
 *                         districts_count: { type: string }
 *                     alerts:
 *                       type: object
 *                       properties:
 *                         total_actions: { type: string }
 *                         resolved_actions: { type: string }
 *                         field_visits: { type: string }
 *                         escalations: { type: string }
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Missing X-Engine-Secret
 *       403:
 *         description: Invalid engine secret
 */
router.get(
  "/overview",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date } = req.query;
    const { dateClause, params } = buildDateClause(days, start_date, end_date);

    const [responses, anomalies, beneficiaries, alerts] = await Promise.all([
      // Total responses
      pool.query(
        `SELECT
           COALESCE(SUM(total_responses), 0)  AS total_responses,
           COALESCE(SUM(yes_count), 0)        AS total_yes,
           COALESCE(SUM(no_count), 0)         AS total_no,
           COUNT(DISTINCT district)            AS districts_reporting,
           COUNT(DISTINCT pincode)             AS pincodes_reporting,
           ROUND(AVG(no_pct)::NUMERIC, 4)     AS avg_no_pct,
           ROUND(AVG(response_rate)::NUMERIC, 4) AS avg_response_rate
         FROM daily_responses
         WHERE ${dateClause("date")}`,
        params
      ),

      // Anomaly summary
      pool.query(
        `SELECT
           COUNT(*)                                                   AS total_anomalies,
           COUNT(*) FILTER (WHERE severity = 'CRITICAL')             AS critical,
           COUNT(*) FILTER (WHERE severity = 'HIGH')                 AS high,
           COUNT(*) FILTER (WHERE severity = 'MEDIUM')               AS medium,
           COUNT(*) FILTER (WHERE severity = 'LOW')                  AS low,
           COUNT(*) FILTER (WHERE status = 'RESOLVED')               AS resolved,
           COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED'))        AS open,
           COUNT(*) FILTER (WHERE ai_classification IS NOT NULL
             AND ai_classification != 'PENDING')                     AS ai_classified,
           ROUND(AVG(ai_confidence)::NUMERIC, 3)                     AS avg_ai_confidence
         FROM anomaly_records
         WHERE ${dateClause("date")}`,
        params
      ),

      // Active beneficiaries
      pool.query(
        `SELECT
           COUNT(*) AS total_beneficiaries,
           COUNT(*) FILTER (WHERE is_active) AS active_beneficiaries,
           COUNT(DISTINCT scheme_id) AS schemes_count,
           COUNT(DISTINCT district)  AS districts_count
         FROM beneficiaries`
      ),

      // Recent alert actions
      pool.query(
        `SELECT
           COUNT(*)                                              AS total_actions,
           COUNT(*) FILTER (WHERE action_type = 'RESOLVED')     AS resolved_actions,
           COUNT(*) FILTER (WHERE action_type = 'FIELD_VISIT_STARTED'
             OR action_type = 'FIELD_VISIT_COMPLETED')          AS field_visits,
           COUNT(*) FILTER (WHERE action_type = 'ESCALATED')    AS escalations
         FROM alert_actions
         WHERE ${dateClause("created_at")}`,
        params
      ),
    ]);

    return res.json({
      success: true,
      window: buildWindowLabel(days, start_date, end_date),
      data: {
        responses:     responses.rows[0],
        anomalies:     anomalies.rows[0],
        beneficiaries: beneficiaries.rows[0],
        alerts:        alerts.rows[0],
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Response and anomaly trends
 *     description: Time-series data for response and anomaly charts.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/SchemeId'
 *       - $ref: '#/components/parameters/District'
 *     responses:
 *       200:
 *         description: Trend data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 window: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     response_trend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string, format: date }
 *                           total_responses: { type: string }
 *                           yes_count: { type: string }
 *                           no_count: { type: string }
 *                           avg_no_pct: { type: string }
 *                     anomaly_trend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string, format: date }
 *                           total_anomalies: { type: string }
 *                           critical: { type: string }
 *                           high: { type: string }
 *                           medium: { type: string }
 *                           low: { type: string }
 */
router.get(
  "/trends",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date, scheme_id, district } = req.query;
    const { dateClause, params } = buildDateClause(days, start_date, end_date);

    let extraWhere = "";
    if (scheme_id) {
      params.push(scheme_id);
      extraWhere += ` AND dr.scheme_id = $${params.length}`;
    }
    if (district) {
      params.push(district);
      extraWhere += ` AND dr.district = $${params.length}`;
    }

    const [responseTrend, anomalyTrend] = await Promise.all([
      pool.query(
        `SELECT
           dr.date,
           SUM(dr.total_responses)   AS total_responses,
           SUM(dr.yes_count)         AS yes_count,
           SUM(dr.no_count)          AS no_count,
           ROUND(AVG(dr.no_pct)::NUMERIC, 4) AS avg_no_pct
         FROM daily_responses dr
         WHERE ${dateClause("dr.date")} ${extraWhere}
         GROUP BY dr.date
         ORDER BY dr.date`,
        params
      ),

      pool.query(
        `SELECT
           ar.date,
           COUNT(*)                                        AS total_anomalies,
           COUNT(*) FILTER (WHERE ar.severity = 'CRITICAL') AS critical,
           COUNT(*) FILTER (WHERE ar.severity = 'HIGH')     AS high,
           COUNT(*) FILTER (WHERE ar.severity = 'MEDIUM')   AS medium,
           COUNT(*) FILTER (WHERE ar.severity = 'LOW')      AS low
         FROM anomaly_records ar
         WHERE ${dateClause("ar.date")}
           ${scheme_id ? `AND ar.scheme_id = $${params.indexOf(scheme_id) + 1}` : ""}
           ${district  ? `AND ar.district = $${params.indexOf(district) + 1}` : ""}
         GROUP BY ar.date
         ORDER BY ar.date`,
        params
      ),
    ]);

    return res.json({
      success: true,
      window: buildWindowLabel(days, start_date, end_date),
      data: {
        response_trend: responseTrend.rows,
        anomaly_trend:  anomalyTrend.rows,
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/dashboard/district-summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Per-district breakdown
 *     description: Per-district breakdown of responses, anomalies, and failure rates for map and table views.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/SchemeId'
 *     responses:
 *       200:
 *         description: District summary list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 window: { type: string }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       district: { type: string }
 *                       total_responses: { type: string }
 *                       yes_count: { type: string }
 *                       no_count: { type: string }
 *                       avg_no_pct: { type: string }
 *                       avg_response_rate: { type: string }
 *                       pincodes: { type: string }
 *                       anomaly_count: { type: string }
 *                       critical_count: { type: string }
 */
router.get(
  "/district-summary",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date, scheme_id } = req.query;
    const { dateClause, params } = buildDateClause(days, start_date, end_date);

    let schemeFilter = "";
    if (scheme_id) {
      params.push(scheme_id);
      schemeFilter = ` AND scheme_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT
         district,
         SUM(total_responses)                      AS total_responses,
         SUM(yes_count)                            AS yes_count,
         SUM(no_count)                             AS no_count,
         ROUND(AVG(no_pct)::NUMERIC, 4)            AS avg_no_pct,
         ROUND(AVG(response_rate)::NUMERIC, 4)     AS avg_response_rate,
         COUNT(DISTINCT pincode)                   AS pincodes,
         (SELECT COUNT(*) FROM anomaly_records ar
          WHERE ar.district = dr.district
            AND ${dateClause("ar.date")} ${schemeFilter}) AS anomaly_count,
         (SELECT COUNT(*) FROM anomaly_records ar
          WHERE ar.district = dr.district
            AND ar.severity = 'CRITICAL'
            AND ${dateClause("ar.date")} ${schemeFilter}) AS critical_count
       FROM daily_responses dr
       WHERE ${dateClause("dr.date")} ${schemeFilter}
       GROUP BY district
       ORDER BY anomaly_count DESC, avg_no_pct DESC`,
      params
    );

    return res.json({
      success: true,
      window: buildWindowLabel(days, start_date, end_date),
      count: rows.length,
      data: rows,
    });
  })
);

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Build a parameterised date WHERE clause.
 * Returns { dateClause: (col) => string, params: any[] }
 */
function buildDateClause(days, startDate, endDate) {
  const params = [];
  let dateClause;

  if (startDate && endDate) {
    params.push(startDate, endDate);
    dateClause = (col) => `${col} >= $1 AND ${col} <= $2`;
  } else {
    params.push(days || 7);
    dateClause = (col) => `${col} >= CURRENT_DATE - ($1 || ' days')::INTERVAL`;
  }

  return { dateClause, params };
}

function buildWindowLabel(days, startDate, endDate) {
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  return `last_${days || 7}_days`;
}

module.exports = router;
