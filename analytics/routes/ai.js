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
 *   - name: AI
 *     description: AI usage tracking, performance, and classification accuracy
 */

/**
 * @swagger
 * /api/analytics/ai/usage:
 *   get:
 *     tags: [AI]
 *     summary: AI token / cost usage
 *     description: Token consumption, cost tracking, and call volume with daily trend.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       200:
 *         description: Usage summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total_calls: { type: string }
 *                         successful_calls: { type: string }
 *                         failed_calls: { type: string }
 *                         total_tokens: { type: string }
 *                         total_cost_usd: { type: string }
 *                         avg_latency_ms: { type: string }
 *                         p50_latency_ms: { type: string }
 *                         p95_latency_ms: { type: string }
 *                     by_model: { type: array, items: { type: object } }
 *                     daily_trend: { type: array, items: { type: object } }
 */
router.get(
  "/usage",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date } = req.query;
    const params = [];
    let dateCond;

    if (start_date && end_date) {
      params.push(start_date, end_date);
      dateCond = `called_at >= $1::TIMESTAMPTZ AND called_at <= ($2::DATE + 1)::TIMESTAMPTZ`;
    } else {
      params.push(days || 7);
      dateCond = `called_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL`;
    }

    const [summary, byModel, dailyTrend] = await Promise.all([
      // Overall summary
      pool.query(
        `SELECT
           COUNT(*)                             AS total_calls,
           COUNT(*) FILTER (WHERE success)      AS successful_calls,
           COUNT(*) FILTER (WHERE NOT success)  AS failed_calls,
           COALESCE(SUM(prompt_tokens), 0)      AS total_prompt_tokens,
           COALESCE(SUM(completion_tokens), 0)  AS total_completion_tokens,
           COALESCE(SUM(total_tokens), 0)       AS total_tokens,
           ROUND(COALESCE(SUM(cost_usd), 0)::NUMERIC, 6)  AS total_cost_usd,
           ROUND(AVG(cost_usd)::NUMERIC, 6)     AS avg_cost_per_call,
           ROUND(AVG(latency_ms))                AS avg_latency_ms,
           ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)) AS p50_latency_ms,
           ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)) AS p95_latency_ms,
           ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)) AS p99_latency_ms
         FROM ai_prompt_log
         WHERE ${dateCond}`,
        params
      ),

      // By model
      pool.query(
        `SELECT
           model,
           COUNT(*)                           AS calls,
           COALESCE(SUM(total_tokens), 0)     AS tokens,
           ROUND(COALESCE(SUM(cost_usd), 0)::NUMERIC, 6) AS cost_usd,
           ROUND(AVG(latency_ms))              AS avg_latency_ms
         FROM ai_prompt_log
         WHERE ${dateCond}
         GROUP BY model
         ORDER BY calls DESC`,
        params
      ),

      // Daily trend
      pool.query(
        `SELECT
           to_date_utc(called_at) AS date,
           COUNT(*)                            AS calls,
           COUNT(*) FILTER (WHERE success)     AS successful,
           COUNT(*) FILTER (WHERE NOT success) AS failed,
           COALESCE(SUM(total_tokens), 0)      AS tokens,
           ROUND(COALESCE(SUM(cost_usd), 0)::NUMERIC, 6) AS cost_usd,
           ROUND(AVG(latency_ms))               AS avg_latency_ms
         FROM ai_prompt_log
         WHERE ${dateCond}
         GROUP BY to_date_utc(called_at)
         ORDER BY date`,
        params
      ),
    ]);

    return res.json({
      success: true,
      data: {
        summary:     summary.rows[0],
        by_model:    byModel.rows,
        daily_trend: dailyTrend.rows,
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/ai/performance:
 *   get:
 *     tags: [AI]
 *     summary: AI performance metrics
 *     description: Latency distribution, error breakdown, and per-lambda stats.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       200:
 *         description: Performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     latency_distribution: { type: array, items: { type: object, properties: { latency_bucket: { type: string }, count: { type: string } } } }
 *                     errors: { type: array, items: { type: object, properties: { error_message: { type: string }, count: { type: string } } } }
 *                     by_lambda: { type: array, items: { type: object } }
 */
router.get(
  "/performance",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date } = req.query;
    const params = [];
    let dateCond;

    if (start_date && end_date) {
      params.push(start_date, end_date);
      dateCond = `called_at >= $1::TIMESTAMPTZ AND called_at <= ($2::DATE + 1)::TIMESTAMPTZ`;
    } else {
      params.push(days || 7);
      dateCond = `called_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL`;
    }

    const [latencyBuckets, errorBreakdown, byLambda] = await Promise.all([
      // Latency distribution
      pool.query(
        `SELECT
           CASE
             WHEN latency_ms < 500   THEN '< 500ms'
             WHEN latency_ms < 1000  THEN '500ms-1s'
             WHEN latency_ms < 2000  THEN '1s-2s'
             WHEN latency_ms < 5000  THEN '2s-5s'
             ELSE '> 5s'
           END AS latency_bucket,
           COUNT(*) AS count
         FROM ai_prompt_log
         WHERE ${dateCond}
         GROUP BY 1
         ORDER BY
           MIN(latency_ms)`,
        params
      ),

      // Error breakdown
      pool.query(
        `SELECT
           error_message,
           COUNT(*) AS count
         FROM ai_prompt_log
         WHERE ${dateCond} AND NOT success
         GROUP BY error_message
         ORDER BY count DESC
         LIMIT 10`,
        params
      ),

      // Per-lambda stats
      pool.query(
        `SELECT
           lambda_name,
           COUNT(*)                             AS total_calls,
           COUNT(*) FILTER (WHERE success)      AS successful,
           ROUND(AVG(latency_ms))                AS avg_latency_ms,
           COALESCE(SUM(total_tokens), 0)        AS total_tokens,
           ROUND(COALESCE(SUM(cost_usd), 0)::NUMERIC, 6) AS cost_usd
         FROM ai_prompt_log
         WHERE ${dateCond}
         GROUP BY lambda_name
         ORDER BY total_calls DESC`,
        params
      ),
    ]);

    return res.json({
      success: true,
      data: {
        latency_distribution: latencyBuckets.rows,
        errors:               errorBreakdown.rows,
        by_lambda:            byLambda.rows,
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/ai/classification-accuracy:
 *   get:
 *     tags: [AI]
 *     summary: Classification accuracy
 *     description: Distribution of AI classifications, confidence bands, and classification-vs-status cross-tab.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/SchemeId'
 *     responses:
 *       200:
 *         description: Accuracy analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     distribution: { type: array, items: { type: object, properties: { ai_classification: { type: string }, count: { type: string }, avg_confidence: { type: string } } } }
 *                     confidence_bands: { type: array, items: { type: object, properties: { confidence_band: { type: string }, count: { type: string } } } }
 *                     classification_vs_status: { type: array, items: { type: object } }
 */
router.get(
  "/classification-accuracy",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date, scheme_id } = req.query;
    const params = [];
    const conditions = [];

    if (start_date && end_date) {
      params.push(start_date, end_date);
      conditions.push(`date >= $1 AND date <= $2`);
    } else {
      params.push(days || 30);
      conditions.push(`date >= CURRENT_DATE - ($1 || ' days')::INTERVAL`);
    }
    if (scheme_id) { params.push(scheme_id); conditions.push(`scheme_id = $${params.length}`); }

    const whereClause = `WHERE ${conditions.join(" AND ")} AND ai_classification IS NOT NULL AND ai_classification != 'PENDING'`;

    const [distribution, confidenceBands, classVsResolution] = await Promise.all([
      // Classification distribution
      pool.query(
        `SELECT
           ai_classification,
           COUNT(*) AS count,
           ROUND(AVG(ai_confidence)::NUMERIC, 3) AS avg_confidence,
           ROUND(MIN(ai_confidence)::NUMERIC, 3) AS min_confidence,
           ROUND(MAX(ai_confidence)::NUMERIC, 3) AS max_confidence
         FROM anomaly_records
         ${whereClause}
         GROUP BY ai_classification
         ORDER BY count DESC`,
        params
      ),

      // Confidence bands
      pool.query(
        `SELECT
           CASE
             WHEN ai_confidence >= 0.9 THEN 'very_high (>=0.9)'
             WHEN ai_confidence >= 0.7 THEN 'high (0.7-0.9)'
             WHEN ai_confidence >= 0.5 THEN 'medium (0.5-0.7)'
             ELSE 'low (<0.5)'
           END AS confidence_band,
           COUNT(*) AS count
         FROM anomaly_records
         ${whereClause}
         GROUP BY 1
         ORDER BY
           MIN(ai_confidence) DESC`,
        params
      ),

      // Classification vs resolution status
      pool.query(
        `SELECT
           ai_classification,
           status,
           COUNT(*) AS count
         FROM anomaly_records
         ${whereClause}
         GROUP BY ai_classification, status
         ORDER BY ai_classification, count DESC`,
        params
      ),
    ]);

    return res.json({
      success: true,
      data: {
        distribution:              distribution.rows,
        confidence_bands:          confidenceBands.rows,
        classification_vs_status:  classVsResolution.rows,
      },
    });
  })
);

module.exports = router;
