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
 *   - name: Anomalies
 *     description: Anomaly records — listing, summary, heatmap, and detail
 */

/**
 * @swagger
 * /api/analytics/anomalies:
 *   get:
 *     tags: [Anomalies]
 *     summary: List anomalies (paginated)
 *     description: Paginated anomaly list with multi-filter support (severity, status, classification, detector, district, scheme, etc.).
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
 *       - name: state
 *         in: query
 *         schema: { type: string }
 *       - name: severity
 *         in: query
 *         schema: { type: string, enum: [CRITICAL, HIGH, MEDIUM, LOW] }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [NEW, ASSIGNED, INVESTIGATING, FIELD_VISIT, RESOLVED, ESCALATED] }
 *       - name: ai_classification
 *         in: query
 *         schema: { type: string, enum: [SUPPLY_FAILURE, DEMAND_COLLAPSE, FRAUD_PATTERN, DATA_ARTIFACT, PENDING] }
 *       - name: detector_type
 *         in: query
 *         schema: { type: string, enum: [NO_SPIKE, SILENCE, DUPLICATE_BENEFICIARY, DISTRICT_ROLLUP] }
 *       - name: level
 *         in: query
 *         schema: { type: string, enum: [PINCODE, BLOCK, DISTRICT] }
 *     responses:
 *       200:
 *         description: Paginated anomaly list
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
 *                       detector_type: { type: string }
 *                       level: { type: string }
 *                       pincode: { type: string, nullable: true }
 *                       block: { type: string, nullable: true }
 *                       district: { type: string }
 *                       state: { type: string }
 *                       scheme_id: { type: string }
 *                       severity: { type: string }
 *                       score: { type: number }
 *                       no_pct: { type: number, nullable: true }
 *                       baseline_no_pct: { type: number, nullable: true }
 *                       total_responses: { type: integer }
 *                       affected_beneficiaries: { type: integer }
 *                       ai_classification: { type: string, nullable: true }
 *                       ai_confidence: { type: number, nullable: true }
 *                       ai_reasoning: { type: string, nullable: true }
 *                       ai_action: { type: string, nullable: true }
 *                       ai_urgency: { type: string, nullable: true }
 *                       status: { type: string }
 *                       assigned_officer_name: { type: string, nullable: true }
 *                       assigned_officer_role: { type: string, nullable: true }
 */
router.get(
  "/",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const {
      page, limit, days, start_date, end_date,
      district, block, state, scheme_id,
      severity, status, ai_classification, detector_type, level,
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    // Date filter
    if (start_date && end_date) {
      params.push(start_date, end_date);
      conditions.push(`ar.date >= $${params.length - 1} AND ar.date <= $${params.length}`);
    } else {
      params.push(days || 7);
      conditions.push(`ar.date >= CURRENT_DATE - ($${params.length} || ' days')::INTERVAL`);
    }

    // Dynamic filters
    const filterMap = { district, block, state, scheme_id, severity, status, ai_classification, detector_type, level };
    for (const [key, val] of Object.entries(filterMap)) {
      if (val) {
        params.push(val);
        conditions.push(`ar.${key} = $${params.length}`);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM anomaly_records ar ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Data query
    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT
         ar.id, ar.date, ar.detector_type, ar.level,
         ar.pincode, ar.block, ar.district, ar.state, ar.scheme_id,
         ar.severity, ar.score, ar.no_pct, ar.baseline_no_pct,
         ar.total_responses, ar.affected_beneficiaries,
         ar.ai_classification, ar.ai_confidence, ar.ai_reasoning,
         ar.ai_action, ar.ai_urgency, ar.ai_processed_at,
         ar.status, ar.assigned_officer_id, ar.assigned_at,
         ar.resolved_at, ar.created_at,
         o.name AS assigned_officer_name,
         o.role AS assigned_officer_role
       FROM anomaly_records ar
       LEFT JOIN officers o ON ar.assigned_officer_id = o.id
       ${whereClause}
       ORDER BY
         CASE ar.severity
           WHEN 'CRITICAL' THEN 1
           WHEN 'HIGH'     THEN 2
           WHEN 'MEDIUM'   THEN 3
           WHEN 'LOW'      THEN 4
         END,
         ar.date DESC, ar.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      success: true,
      pagination: {
        page, limit, total,
        total_pages: Math.ceil(total / limit),
      },
      data: rows,
    });
  })
);

/**
 * @swagger
 * /api/analytics/anomalies/summary:
 *   get:
 *     tags: [Anomalies]
 *     summary: Anomaly summary aggregates
 *     description: Aggregated counts grouped by severity, AI classification, status, and detector type.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/District'
 *       - $ref: '#/components/parameters/SchemeId'
 *     responses:
 *       200:
 *         description: Summary breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     by_severity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           severity: { type: string }
 *                           count: { type: string }
 *                     by_classification:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           classification: { type: string }
 *                           count: { type: string }
 *                     by_status:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status: { type: string }
 *                           count: { type: string }
 *                     by_detector_type:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           detector_type: { type: string }
 *                           count: { type: string }
 */
router.get(
  "/summary",
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
      params.push(days || 7);
      conditions.push(`date >= CURRENT_DATE - ($1 || ' days')::INTERVAL`);
    }
    if (district) { params.push(district); conditions.push(`district = $${params.length}`); }
    if (scheme_id) { params.push(scheme_id); conditions.push(`scheme_id = $${params.length}`); }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [bySeverity, byClassification, byStatus, byDetector] = await Promise.all([
      pool.query(
        `SELECT severity, COUNT(*) AS count
         FROM anomaly_records ${whereClause}
         GROUP BY severity ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT COALESCE(ai_classification, 'PENDING') AS classification, COUNT(*) AS count
         FROM anomaly_records ${whereClause}
         GROUP BY ai_classification ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT status, COUNT(*) AS count
         FROM anomaly_records ${whereClause}
         GROUP BY status ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT detector_type, COUNT(*) AS count
         FROM anomaly_records ${whereClause}
         GROUP BY detector_type ORDER BY count DESC`,
        params
      ),
    ]);

    return res.json({
      success: true,
      data: {
        by_severity:       bySeverity.rows,
        by_classification: byClassification.rows,
        by_status:         byStatus.rows,
        by_detector_type:  byDetector.rows,
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/anomalies/heatmap:
 *   get:
 *     tags: [Anomalies]
 *     summary: Anomaly heatmap data
 *     description: District × scheme anomaly counts for map visualisation.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       200:
 *         description: Heatmap cells
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
 *                       scheme_id: { type: string }
 *                       anomaly_count: { type: string }
 *                       critical: { type: string }
 *                       high: { type: string }
 *                       avg_score: { type: string }
 *                       avg_no_pct: { type: string }
 */
router.get(
  "/heatmap",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date } = req.query;
    const params = [];
    let dateCond;

    if (start_date && end_date) {
      params.push(start_date, end_date);
      dateCond = `date >= $1 AND date <= $2`;
    } else {
      params.push(days || 7);
      dateCond = `date >= CURRENT_DATE - ($1 || ' days')::INTERVAL`;
    }

    const { rows } = await pool.query(
      `SELECT
         district,
         scheme_id,
         COUNT(*)                                          AS anomaly_count,
         COUNT(*) FILTER (WHERE severity = 'CRITICAL')    AS critical,
         COUNT(*) FILTER (WHERE severity = 'HIGH')        AS high,
         ROUND(AVG(score)::NUMERIC, 2)                    AS avg_score,
         ROUND(AVG(no_pct)::NUMERIC, 4)                   AS avg_no_pct
       FROM anomaly_records
       WHERE ${dateCond}
       GROUP BY district, scheme_id
       ORDER BY anomaly_count DESC`,
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
 * /api/analytics/anomalies/{id}:
 *   get:
 *     tags: [Anomalies]
 *     summary: Single anomaly detail
 *     description: Full anomaly record with action timeline and AI prompt logs.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Anomaly record UUID
 *     responses:
 *       200:
 *         description: Anomaly detail with actions and AI prompts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     date: { type: string, format: date }
 *                     detector_type: { type: string }
 *                     severity: { type: string }
 *                     ai_classification: { type: string, nullable: true }
 *                     ai_confidence: { type: number, nullable: true }
 *                     ai_reasoning: { type: string, nullable: true }
 *                     status: { type: string }
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           action_type: { type: string }
 *                           notes: { type: string }
 *                           officer_name: { type: string }
 *                           created_at: { type: string, format: date-time }
 *                     ai_prompts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           model: { type: string }
 *                           total_tokens: { type: integer }
 *                           cost_usd: { type: number }
 *                           latency_ms: { type: integer }
 *                           success: { type: boolean }
 *       404:
 *         description: Anomaly not found
 */
router.get(
  "/:id",
  validateEngineSecret,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [anomalyResult, actionsResult, promptResult] = await Promise.all([
      pool.query(
        `SELECT
           ar.*,
           o.name  AS assigned_officer_name,
           o.email AS assigned_officer_email,
           o.role  AS assigned_officer_role
         FROM anomaly_records ar
         LEFT JOIN officers o ON ar.assigned_officer_id = o.id
         WHERE ar.id = $1`,
        [id]
      ),
      pool.query(
        `SELECT
           aa.id, aa.action_type, aa.notes, aa.resolution_details,
           aa.field_visit_location, aa.photos_s3_keys, aa.created_at,
           o.name AS officer_name, o.role AS officer_role
         FROM alert_actions aa
         JOIN officers o ON aa.officer_id = o.id
         WHERE aa.anomaly_record_id = $1
         ORDER BY aa.created_at ASC`,
        [id]
      ),
      pool.query(
        `SELECT id, model, prompt_tokens, completion_tokens, total_tokens,
                cost_usd, latency_ms, success, called_at
         FROM ai_prompt_log
         WHERE anomaly_record_id = $1
         ORDER BY called_at ASC`,
        [id]
      ),
    ]);

    if (anomalyResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Anomaly not found" });
    }

    return res.json({
      success: true,
      data: {
        ...anomalyResult.rows[0],
        actions:   actionsResult.rows,
        ai_prompts: promptResult.rows,
      },
    });
  })
);

module.exports = router;
