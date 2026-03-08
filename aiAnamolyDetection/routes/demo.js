const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/db");
const logger = require("../config/logger");
const { classifyAnomaly } = require("../services/openaiService");
const { validateEngineSecret } = require("../middleware/validate");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─────────────────────────────────────────────────────────────
// POST /api/demo/run-week
// Accept 7 days of mock daily_responses, run anomaly detection,
// classify via OpenAI, generate a report — full pipeline demo.
// ─────────────────────────────────────────────────────────────
router.post(
  "/run-week",
  validateEngineSecret,
  asyncHandler(async (req, res) => {
    const { days, district, scheme_id, pincode, block, state } = req.body;

    if (!Array.isArray(days) || days.length === 0 || days.length > 14) {
      return res.status(400).json({ success: false, error: "days must be an array of 1-14 entries" });
    }
    if (!district || !scheme_id) {
      return res.status(400).json({ success: false, error: "district and scheme_id are required" });
    }

    const demo_id = uuidv4();
    const pc = pincode || "600001";
    const blk = block || "Block-A";
    const st = state || "Tamil Nadu";

    logger.info("Demo run started", { demo_id, district, scheme_id, days: days.length });

    // ── Step 1: Insert daily_responses ──────────────────────
    const insertedResponses = [];
    for (const day of days) {
      const id = uuidv4();
      const yesCount = Math.max(0, Math.round(day.yes_count ?? 0));
      const noCount = Math.max(0, Math.round(day.no_count ?? 0));
      const total = yesCount + noCount;
      const noPct = total > 0 ? noCount / total : 0;
      const activeBen = Math.max(1, Math.round(day.active_beneficiaries ?? 500));
      const responseRate = total / activeBen;

      await pool.query(
        `INSERT INTO daily_responses
           (id, date, pincode, scheme_id, block, district, state,
            yes_count, no_count, total_responses, no_pct,
            active_beneficiaries, response_rate)
         VALUES ($1, $2::DATE, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (pincode, scheme_id, date) DO UPDATE SET
           yes_count = EXCLUDED.yes_count,
           no_count = EXCLUDED.no_count,
           total_responses = EXCLUDED.total_responses,
           no_pct = EXCLUDED.no_pct,
           active_beneficiaries = EXCLUDED.active_beneficiaries,
           response_rate = EXCLUDED.response_rate`,
        [id, day.date, pc, scheme_id, blk, district, st,
         yesCount, noCount, total, noPct, activeBen, responseRate]
      );

      insertedResponses.push({
        id, date: day.date, pincode: pc, scheme_id, block: blk,
        district, state: st, yes_count: yesCount, no_count: noCount,
        total_responses: total, no_pct: parseFloat(noPct.toFixed(4)),
        active_beneficiaries: activeBen,
        response_rate: parseFloat(responseRate.toFixed(4)),
      });
    }

    // ── Step 2: Run anomaly detection ────────────────────────
    // Use robust z-score (median / MAD) so outlier spike days
    // don't inflate the baseline and dilute their own scores.
    const noPcts = insertedResponses.map((r) => r.no_pct);
    const sorted = [...noPcts].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const deviations = noPcts.map((x) => Math.abs(x - median)).sort((a, b) => a - b);
    const mad =
      deviations.length % 2 === 0
        ? (deviations[deviations.length / 2 - 1] + deviations[deviations.length / 2]) / 2
        : deviations[Math.floor(deviations.length / 2)];
    // 1.4826 = consistency constant for normal distribution
    // Floor at 0.03 (3%) so uniform normal data doesn't trigger false positives
    const rawScaledMad = mad * 1.4826;
    const scaledMad = Math.max(rawScaledMad, 0.03);

    const detectedAnomalies = [];
    for (const r of insertedResponses) {
      const zScore = (r.no_pct - median) / scaledMad;
      let severity = null;

      if (zScore >= 3.0) severity = "CRITICAL";
      else if (zScore >= 2.0) severity = "HIGH";
      else if (zScore >= 1.5) severity = "MEDIUM";

      // SILENCE: flag only when the response rate is truly low
      // (absolute threshold — not relative to the window)
      let silenceSeverity = null;
      if (r.response_rate < 0.10) silenceSeverity = "HIGH";
      else if (r.response_rate < 0.20) silenceSeverity = "MEDIUM";

      if (severity && r.total_responses >= 5) {
        const anomalyId = uuidv4();
        detectedAnomalies.push({
          id: anomalyId,
          date: r.date,
          detector_type: "NO_SPIKE",
          level: "PINCODE",
          pincode: pc,
          block: blk,
          district,
          state: st,
          scheme_id,
          severity,
          score: parseFloat(zScore.toFixed(4)),
          no_pct: r.no_pct,
          baseline_no_pct: parseFloat(median.toFixed(4)),
          total_responses: r.total_responses,
          affected_beneficiaries: r.active_beneficiaries,
          raw_data: {
            demo_id,
            z_score: parseFloat(zScore.toFixed(4)),
            median_no_pct: parseFloat(median.toFixed(4)),
            mad: parseFloat(mad.toFixed(4)),
            scaled_mad: parseFloat(scaledMad.toFixed(4)),
            day_data: r,
          },
        });
      }

      if (silenceSeverity && !severity) {
        const anomalyId = uuidv4();
        const silenceRatio = 1 - r.response_rate;
        detectedAnomalies.push({
          id: anomalyId,
          date: r.date,
          detector_type: "SILENCE",
          level: "PINCODE",
          pincode: pc,
          block: blk,
          district,
          state: st,
          scheme_id,
          severity: silenceSeverity,
          score: parseFloat(silenceRatio.toFixed(4)),
          no_pct: r.no_pct,
          baseline_no_pct: parseFloat(median.toFixed(4)),
          total_responses: r.total_responses,
          affected_beneficiaries: r.active_beneficiaries,
          raw_data: {
            demo_id,
            silence_ratio: parseFloat(silenceRatio.toFixed(4)),
            day_data: r,
          },
        });
      }

      // DUPLICATE_BENEFICIARY: response_rate > 1.0 means more responses
      // than enrolled beneficiaries — ghost/duplicate entries suspected
      if (r.response_rate > 1.0) {
        let dupSeverity = "MEDIUM";
        if (r.response_rate >= 1.5) dupSeverity = "CRITICAL";
        else if (r.response_rate >= 1.2) dupSeverity = "HIGH";

        const anomalyId = uuidv4();
        detectedAnomalies.push({
          id: anomalyId,
          date: r.date,
          detector_type: "DUPLICATE_BENEFICIARY",
          level: "PINCODE",
          pincode: pc,
          block: blk,
          district,
          state: st,
          scheme_id,
          severity: dupSeverity,
          score: parseFloat(r.response_rate.toFixed(4)),
          no_pct: r.no_pct,
          baseline_no_pct: parseFloat(median.toFixed(4)),
          total_responses: r.total_responses,
          affected_beneficiaries: r.active_beneficiaries,
          raw_data: {
            demo_id,
            response_rate: r.response_rate,
            expected_max: r.active_beneficiaries,
            actual_total: r.total_responses,
            excess_responses: r.total_responses - r.active_beneficiaries,
            day_data: r,
          },
        });
      }
    }

    // ── Step 3: Classify anomalies via OpenAI ───────────────
    const classificationResults = [];
    for (const anomaly of detectedAnomalies) {
      try {
        const result = await classifyAnomaly(anomaly);
        classificationResults.push(result);
      } catch (err) {
        classificationResults.push({
          success: false,
          anomaly_id: anomaly.id,
          error: err.message,
        });
      }
      // Small delay between calls
      if (detectedAnomalies.indexOf(anomaly) < detectedAnomalies.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // ── Step 4: Generate report in daily_reports ────────────
    const totalResp = insertedResponses.reduce((s, r) => s + r.total_responses, 0);
    const criticalCount = detectedAnomalies.filter((a) => a.severity === "CRITICAL").length;
    const highCount = detectedAnomalies.filter((a) => a.severity === "HIGH").length;
    const mediumCount = detectedAnomalies.filter((a) => a.severity === "MEDIUM").length;

    const classifiedResults = classificationResults.filter((c) => c.success);
    const classifications = classifiedResults.map((c) => c.result?.ai_classification).filter(Boolean);

    const schemeSummary = {
      [scheme_id]: {
        total_responses: totalResp,
        anomalies: detectedAnomalies.length,
        classifications: classifications.reduce((acc, c) => {
          acc[c] = (acc[c] || 0) + 1;
          return acc;
        }, {}),
      },
    };

    // Build narrative
    const narrativeParts = [
      `Demo report for ${district} district covering ${days.length} days.`,
      `Total responses collected: ${totalResp} for scheme ${scheme_id}.`,
    ];
    if (detectedAnomalies.length === 0) {
      narrativeParts.push("No anomalies detected — all metrics within normal bounds.");
    } else {
      narrativeParts.push(
        `${detectedAnomalies.length} anomal${detectedAnomalies.length === 1 ? "y" : "ies"} detected: ` +
        `${criticalCount} critical, ${highCount} high, ${mediumCount} medium.`
      );
      for (const cr of classifiedResults) {
        narrativeParts.push(
          `[${cr.result.ai_classification}] (${(cr.result.ai_confidence * 100).toFixed(0)}% confidence): ${cr.result.ai_reasoning}`
        );
      }
    }

    const reportDate = days[days.length - 1].date;
    const reportId = uuidv4();

    const narrative = narrativeParts.join("\n");

    // Try with narrative_text column first; fall back without it
    try {
      await pool.query(
        `INSERT INTO daily_reports
           (id, district, report_date, narrative_text, total_responses,
            total_anomalies, critical_count, high_count, medium_count,
            schemes_summary, generated_at)
         VALUES ($1, $2, $3::DATE, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT DO NOTHING`,
        [
          reportId, district, reportDate, narrative,
          totalResp, detectedAnomalies.length, criticalCount, highCount, mediumCount,
          JSON.stringify(schemeSummary),
        ]
      );
    } catch (colErr) {
      if (colErr.message && colErr.message.includes("narrative_text")) {
        await pool.query(
          `INSERT INTO daily_reports
             (id, district, report_date, total_responses,
              total_anomalies, critical_count, high_count, medium_count,
              schemes_summary, generated_at)
           VALUES ($1, $2, $3::DATE, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT DO NOTHING`,
          [
            reportId, district, reportDate,
            totalResp, detectedAnomalies.length, criticalCount, highCount, mediumCount,
            JSON.stringify(schemeSummary),
          ]
        );
      } else {
        throw colErr;
      }
    }

    logger.info("Demo run complete", {
      demo_id,
      responses: insertedResponses.length,
      anomalies: detectedAnomalies.length,
      classified: classifiedResults.length,
    });

    return res.status(200).json({
      success: true,
      demo_id,
      summary: {
        district,
        scheme_id,
        days_processed: insertedResponses.length,
        total_responses: totalResp,
        anomalies_detected: detectedAnomalies.length,
        anomalies_classified: classifiedResults.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
      },
      responses: insertedResponses,
      anomalies: detectedAnomalies,
      classifications: classificationResults,
      report: {
        id: reportId,
        district,
        report_date: reportDate,
        narrative,
        schemes_summary: schemeSummary,
      },
    });
  })
);

module.exports = router;
