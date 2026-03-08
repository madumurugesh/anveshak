const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const logger = require("../config/logger");
const { validateEngineSecret, validateQuery } = require("../middleware/validate");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_REPORT_BUCKET || "anveshak-reports";
const PRESIGN_EXPIRES = parseInt(process.env.S3_PRESIGN_EXPIRES || "3600");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/reports
// List daily reports with pagination and filters
// ─────────────────────────────────────────────────────────────
router.get(
  "/",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { page, limit, days, start_date, end_date, district } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (start_date && end_date) {
      params.push(start_date, end_date);
      conditions.push(`report_date >= $1 AND report_date <= $2`);
    } else {
      params.push(days || 7);
      conditions.push(`report_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL`);
    }

    if (district) {
      params.push(district);
      conditions.push(`district = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM daily_reports ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT
         id, district, report_date,
         total_responses, total_anomalies,
         critical_count, high_count, medium_count,
         schemes_summary,
         best_performing_block, worst_performing_pincode,
         pdf_s3_key,
         email_sent, email_sent_at,
         generated_at
       FROM daily_reports
       ${whereClause}
       ORDER BY report_date DESC, district ASC
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

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/reports/:id/pdf
// Generate a presigned S3 URL for the report PDF
// ─────────────────────────────────────────────────────────────
router.get(
  "/:id/pdf",
  validateEngineSecret,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT pdf_s3_key, district, report_date FROM daily_reports WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const { pdf_s3_key, district, report_date } = rows[0];

    if (!pdf_s3_key) {
      return res.status(404).json({ success: false, error: "No PDF available for this report" });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: pdf_s3_key,
      ResponseContentDisposition: `attachment; filename="${district}_${report_date}.pdf"`,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES });

    return res.json({
      success: true,
      data: {
        report_id: id,
        district,
        report_date,
        download_url: url,
        expires_in: PRESIGN_EXPIRES,
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/reports/:id
// Full report detail with narrative and scheme breakdown
// ─────────────────────────────────────────────────────────────
router.get(
  "/:id",
  validateEngineSecret,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM daily_reports WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    // Fetch related anomalies for that day & district
    const anomalies = await pool.query(
      `SELECT id, detector_type, severity, scheme_id, pincode, block,
              ai_classification, ai_confidence, status
       FROM anomaly_records
       WHERE district = $1 AND date = $2
       ORDER BY severity, created_at DESC`,
      [rows[0].district, rows[0].report_date]
    );

    // Fetch notifications sent for this report
    const notifications = await pool.query(
      `SELECT id, channel, message_type, recipient_address, delivered, sent_at
       FROM notification_log
       WHERE report_id = $1
       ORDER BY sent_at DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...rows[0],
        anomalies:     anomalies.rows,
        notifications: notifications.rows,
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/reports/district/:district
// All reports for a specific district
// ─────────────────────────────────────────────────────────────
router.get(
  "/district/:district",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { district } = req.params;
    const { page, limit, days, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    const params = [district];
    const conditions = [`district = $1`];

    if (start_date && end_date) {
      params.push(start_date, end_date);
      conditions.push(`report_date >= $${params.length - 1} AND report_date <= $${params.length}`);
    } else {
      params.push(days || 7);
      conditions.push(`report_date >= CURRENT_DATE - ($${params.length} || ' days')::INTERVAL`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM daily_reports ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT
         id, district, report_date,
         total_responses, total_anomalies,
         critical_count, high_count, medium_count,
         schemes_summary,
         best_performing_block, worst_performing_pincode,
         pdf_s3_key,
         email_sent, generated_at
       FROM daily_reports
       ${whereClause}
       ORDER BY report_date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      success: true,
      district,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      data: rows,
    });
  })
);

module.exports = router;
