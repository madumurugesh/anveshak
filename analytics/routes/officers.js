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
 *   - name: Officers
 *     description: Field officers — listing, profile, and action timeline
 */

/**
 * @swagger
 * /api/analytics/officers:
 *   get:
 *     tags: [Officers]
 *     summary: List all officers
 *     description: List all officers with their activity stats. Optionally filter by district or state.
 *     parameters:
 *       - $ref: '#/components/parameters/District'
 *       - name: state
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Officer list with stats
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
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       email: { type: string }
 *                       role: { type: string }
 *                       district: { type: string, nullable: true }
 *                       block: { type: string, nullable: true }
 *                       state: { type: string }
 *                       is_active: { type: boolean }
 *                       total_actions: { type: string }
 *                       field_visits: { type: string }
 *                       resolved_count: { type: string }
 *                       assigned_anomalies: { type: string }
 *                       open_anomalies: { type: string }
 */
router.get(
  "/",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { district, state } = req.query;
    const params = [];
    const conditions = [];

    if (district) { params.push(district); conditions.push(`o.district = $${params.length}`); }
    if (state)    { params.push(state);    conditions.push(`o.state = $${params.length}`); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT
         o.id, o.name, o.email, o.role,
         o.district, o.block, o.state,
         o.is_active, o.last_login_at, o.created_at,
         COALESCE(stats.total_actions, 0)         AS total_actions,
         COALESCE(stats.field_visits, 0)          AS field_visits,
         COALESCE(stats.resolved_count, 0)        AS resolved_count,
         COALESCE(stats.escalated_count, 0)       AS escalated_count,
         COALESCE(assigned.assigned_anomalies, 0) AS assigned_anomalies,
         COALESCE(assigned.open_anomalies, 0)     AS open_anomalies
       FROM officers o
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*)                                              AS total_actions,
           COUNT(*) FILTER (WHERE action_type IN ('FIELD_VISIT_STARTED', 'FIELD_VISIT_COMPLETED')) AS field_visits,
           COUNT(*) FILTER (WHERE action_type = 'RESOLVED')     AS resolved_count,
           COUNT(*) FILTER (WHERE action_type = 'ESCALATED')    AS escalated_count
         FROM alert_actions aa
         WHERE aa.officer_id = o.id
       ) stats ON true
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*)                                              AS assigned_anomalies,
           COUNT(*) FILTER (WHERE status != 'RESOLVED')         AS open_anomalies
         FROM anomaly_records ar
         WHERE ar.assigned_officer_id = o.id
       ) assigned ON true
       ${whereClause}
       ORDER BY o.role, o.name`,
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
 * /api/analytics/officers/{id}:
 *   get:
 *     tags: [Officers]
 *     summary: Officer profile
 *     description: Single officer profile with recent actions, assigned anomalies, and login sessions.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Officer detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string }
 *                     recent_actions: { type: array, items: { type: object } }
 *                     assigned_anomalies: { type: array, items: { type: object } }
 *                     recent_sessions: { type: array, items: { type: object } }
 *       404:
 *         description: Officer not found
 */
router.get(
  "/:id",
  validateEngineSecret,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const officerResult = await pool.query(
      `SELECT id, name, email, role, district, block, state,
              is_active, last_login_at, created_at
       FROM officers WHERE id = $1`,
      [id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Officer not found" });
    }

    const [actions, assignedAnomalies, sessions] = await Promise.all([
      // Recent actions
      pool.query(
        `SELECT
           aa.id, aa.action_type, aa.notes, aa.created_at,
           ar.id AS anomaly_id, ar.severity, ar.scheme_id, ar.district
         FROM alert_actions aa
         JOIN anomaly_records ar ON aa.anomaly_record_id = ar.id
         WHERE aa.officer_id = $1
         ORDER BY aa.created_at DESC
         LIMIT 50`,
        [id]
      ),
      // Currently assigned anomalies
      pool.query(
        `SELECT id, date, detector_type, severity, scheme_id, district,
                pincode, block, status, ai_classification, assigned_at
         FROM anomaly_records
         WHERE assigned_officer_id = $1
         ORDER BY
           CASE severity
             WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4
           END,
           assigned_at DESC`,
        [id]
      ),
      // Recent sessions
      pool.query(
        `SELECT id, ip_address, login_at, last_active_at, logout_at
         FROM dashboard_sessions
         WHERE officer_id = $1
         ORDER BY login_at DESC
         LIMIT 10`,
        [id]
      ),
    ]);

    return res.json({
      success: true,
      data: {
        ...officerResult.rows[0],
        recent_actions:     actions.rows,
        assigned_anomalies: assignedAnomalies.rows,
        recent_sessions:    sessions.rows,
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/officers/{id}/actions:
 *   get:
 *     tags: [Officers]
 *     summary: Officer action timeline
 *     description: Paginated action timeline for an officer.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       200:
 *         description: Paginated action list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 officer_id: { type: string }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *                 data: { type: array, items: { type: object } }
 */
router.get(
  "/:id/actions",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page, limit, days, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    const params = [id];
    const conditions = [`aa.officer_id = $1`];

    if (start_date && end_date) {
      params.push(start_date, end_date);
      conditions.push(`aa.created_at >= $${params.length - 1} AND aa.created_at <= $${params.length}`);
    } else {
      params.push(days || 30);
      conditions.push(`aa.created_at >= CURRENT_DATE - ($${params.length} || ' days')::INTERVAL`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM alert_actions aa ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT
         aa.id, aa.action_type, aa.notes, aa.resolution_details,
         aa.field_visit_location, aa.created_at,
         ar.id AS anomaly_id, ar.date AS anomaly_date,
         ar.severity, ar.scheme_id, ar.district, ar.pincode
       FROM alert_actions aa
       JOIN anomaly_records ar ON aa.anomaly_record_id = ar.id
       ${whereClause}
       ORDER BY aa.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      success: true,
      officer_id: id,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      data: rows,
    });
  })
);

module.exports = router;
