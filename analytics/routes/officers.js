const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const logger = require("../config/logger");
const { validateEngineSecret, validateQuery } = require("../middleware/validate");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/officers
// List all officers with their activity stats
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/officers/:id
// Single officer profile with performance metrics
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/officers/:id/actions
// Paginated action timeline for an officer
// ─────────────────────────────────────────────────────────────
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
