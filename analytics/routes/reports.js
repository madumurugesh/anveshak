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

/**
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Daily district reports — listing, detail, PDF download, per-district
 */

/**
 * @swagger
 * /api/analytics/reports:
 *   get:
 *     tags: [Reports]
 *     summary: List daily reports
 *     description: Paginated list of daily reports with optional date and district filters.
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/District'
 *     responses:
 *       200:
 *         description: Paginated report list
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
 *                       district: { type: string }
 *                       report_date: { type: string, format: date }
 *                       total_responses: { type: integer }
 *                       total_anomalies: { type: integer }
 *                       critical_count: { type: integer }
 *                       high_count: { type: integer }
 *                       medium_count: { type: integer }
 *                       schemes_summary: { type: object }
 *                       best_performing_block: { type: string, nullable: true }
 *                       worst_performing_pincode: { type: string, nullable: true }
 *                       pdf_s3_key: { type: string, nullable: true }
 *                       email_sent: { type: boolean }
 *                       email_sent_at: { type: string, format: date-time, nullable: true }
 *                       generated_at: { type: string, format: date-time }
 */
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

/**
 * @swagger
 * /api/analytics/reports/{id}/pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Download report PDF
 *     description: Generate a presigned S3 URL for the report PDF.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Report UUID
 *     responses:
 *       200:
 *         description: Presigned download URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     report_id: { type: string }
 *                     district: { type: string }
 *                     report_date: { type: string, format: date }
 *                     download_url: { type: string, format: uri }
 *                     expires_in: { type: integer }
 *       404:
 *         description: Report or PDF not found
 */
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

/**
 * @swagger
 * /api/analytics/reports/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Report detail
 *     description: Full report detail with linked anomalies and notification log.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full report with anomalies and notifications
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
 *                     district: { type: string }
 *                     report_date: { type: string, format: date }
 *                     anomalies: { type: array, items: { type: object } }
 *                     notifications: { type: array, items: { type: object } }
 *       404:
 *         description: Report not found
 */
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

/**
 * @swagger
 * /api/analytics/reports/district/{district}:
 *   get:
 *     tags: [Reports]
 *     summary: Reports by district
 *     description: All reports for a specific district, paginated.
 *     parameters:
 *       - name: district
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: District name
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       200:
 *         description: Paginated reports for the district
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 district: { type: string }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *                 data: { type: array, items: { type: object } }
 */
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
