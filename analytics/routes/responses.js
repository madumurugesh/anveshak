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
 *   - name: Responses
 *     description: Daily response analytics, trends, rejections, and baselines
 */

/**
 * @swagger
 * /api/analytics/responses/daily:
 *   get:
 *     tags: [Responses]
 *     summary: Daily response aggregates
 *     description: Paginated daily response data with multi-filter support.
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/District'
 *       - $ref: '#/components/parameters/SchemeId'
 *       - name: block
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated daily responses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       date: { type: string, format: date }
 *                       pincode: { type: string }
 *                       scheme_id: { type: string }
 *                       district: { type: string }
 *                       yes_count: { type: integer }
 *                       no_count: { type: integer }
 *                       total_responses: { type: integer }
 *                       no_pct: { type: number }
 *                       response_rate: { type: number }
 */
router.get(
  "/daily",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const {
      page, limit, days, start_date, end_date,
      district, block, scheme_id,
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (start_date && end_date) {
      params.push(start_date, end_date);
      conditions.push(`date >= $1 AND date <= $2`);
    } else {
      params.push(days || 7);
      conditions.push(`date >= CURRENT_DATE - ($1 || ' days')::INTERVAL`);
    }

    if (district)  { params.push(district);  conditions.push(`district = $${params.length}`); }
    if (block)     { params.push(block);     conditions.push(`block = $${params.length}`); }
    if (scheme_id) { params.push(scheme_id); conditions.push(`scheme_id = $${params.length}`); }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM daily_responses ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT
         id, date, pincode, scheme_id, block, district, state,
         yes_count, no_count, total_responses,
         no_pct, active_beneficiaries, response_rate,
         created_at
       FROM daily_responses
       ${whereClause}
       ORDER BY date DESC, district, pincode
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      success: true,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      data: rows,
    });
  })
);

/**
 * @swagger
 * /api/analytics/responses/trends:
 *   get:
 *     tags: [Responses]
 *     summary: Response trends
 *     description: Aggregated daily totals for time-series charts.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/District'
 *       - $ref: '#/components/parameters/SchemeId'
 *     responses:
 *       200:
 *         description: Time-series data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date: { type: string, format: date }
 *                       total_responses: { type: string }
 *                       yes_count: { type: string }
 *                       no_count: { type: string }
 *                       avg_no_pct: { type: string }
 *                       avg_response_rate: { type: string }
 */
router.get(
  "/trends",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date, district, scheme_id } = req.query;
    const params = [];
    const conditions = [];

    if (start_date && end_date) {
      params.push(start_date, end_date);
      conditions.push(`date >= $1 AND date <= $2`);
    } else {
      params.push(days || 30);
      conditions.push(`date >= CURRENT_DATE - ($1 || ' days')::INTERVAL`);
    }

    if (district)  { params.push(district);  conditions.push(`district = $${params.length}`); }
    if (scheme_id) { params.push(scheme_id); conditions.push(`scheme_id = $${params.length}`); }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const { rows } = await pool.query(
      `SELECT
         date,
         SUM(total_responses)       AS total_responses,
         SUM(yes_count)             AS yes_count,
         SUM(no_count)              AS no_count,
         ROUND(AVG(no_pct)::NUMERIC, 4)        AS avg_no_pct,
         ROUND(AVG(response_rate)::NUMERIC, 4)  AS avg_response_rate,
         COUNT(DISTINCT pincode)    AS pincodes_reporting,
         COUNT(DISTINCT district)   AS districts_reporting
       FROM daily_responses
       ${whereClause}
       GROUP BY date
       ORDER BY date`,
      params
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  })
);

/**
 * @swagger
 * /api/analytics/responses/rejections:
 *   get:
 *     tags: [Responses]
 *     summary: Rejection analytics
 *     description: Summary, breakdown by reason, and daily trend for rejected responses.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/SchemeId'
 *     responses:
 *       200:
 *         description: Rejection data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_rejections: { type: integer }
 *                     by_reason: { type: array, items: { type: object, properties: { rejection_reason: { type: string }, scheme_id: { type: string }, count: { type: string } } } }
 *                     daily_trend: { type: array, items: { type: object, properties: { date: { type: string, format: date }, rejections: { type: string } } } }
 */
router.get(
  "/rejections",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date, scheme_id } = req.query;
    const params = [];
    const conditions = [];

    if (start_date && end_date) {
      params.push(start_date, end_date);
      conditions.push(`to_date_utc(rejected_at) >= $1::DATE AND to_date_utc(rejected_at) <= $2::DATE`);
    } else {
      params.push(days || 7);
      conditions.push(`rejected_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL`);
    }

    if (scheme_id) { params.push(scheme_id); conditions.push(`scheme_id = $${params.length}`); }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [summary, byReason, trend] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total_rejections FROM rejected_responses ${whereClause}`,
        params
      ),
      pool.query(
        `SELECT
           rejection_reason,
           scheme_id,
           COUNT(*) AS count
         FROM rejected_responses
         ${whereClause}
         GROUP BY rejection_reason, scheme_id
         ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT
           to_date_utc(rejected_at) AS date,
           COUNT(*) AS rejections,
           COUNT(*) FILTER (WHERE rejection_reason = 'DUPLICATE')   AS duplicates,
           COUNT(*) FILTER (WHERE rejection_reason = 'UNREGISTERED') AS unregistered,
           COUNT(*) FILTER (WHERE rejection_reason = 'INVALID_INPUT') AS invalid_input
         FROM rejected_responses
         ${whereClause}
         GROUP BY to_date_utc(rejected_at)
         ORDER BY date`,
        params
      ),
    ]);

    return res.json({
      success: true,
      data: {
        total_rejections: parseInt(summary.rows[0].total_rejections),
        by_reason:        byReason.rows,
        daily_trend:      trend.rows,
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/responses/baselines:
 *   get:
 *     tags: [Responses]
 *     summary: District baselines
 *     description: Computed baseline metrics for each district×scheme×block combination.
 *     parameters:
 *       - $ref: '#/components/parameters/District'
 *       - $ref: '#/components/parameters/SchemeId'
 *     responses:
 *       200:
 *         description: Baseline data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       district: { type: string }
 *                       block: { type: string }
 *                       scheme_id: { type: string }
 *                       computed_date: { type: string, format: date }
 *                       avg_no_pct: { type: number }
 *                       std_dev_no_pct: { type: number }
 *                       avg_total_responses: { type: number }
 *                       avg_response_rate: { type: number }
 *                       sample_days: { type: integer }
 */
router.get(
  "/baselines",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { district, scheme_id } = req.query;
    const params = [];
    const conditions = [];

    if (district)  { params.push(district);  conditions.push(`district = $${params.length}`); }
    if (scheme_id) { params.push(scheme_id); conditions.push(`scheme_id = $${params.length}`); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT
         district, block, scheme_id, computed_date,
         avg_no_pct, std_dev_no_pct,
         avg_total_responses, avg_response_rate,
         sample_days
       FROM district_baselines
       ${whereClause}
       ORDER BY computed_date DESC, district, scheme_id`,
      params
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  })
);

module.exports = router;
