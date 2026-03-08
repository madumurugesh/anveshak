const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const logger = require("../config/logger");
const { validateEngineSecret, validateQuery } = require("../middleware/validate");
const Joi = require("joi");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * tags:
 *   - name: Beneficiaries
 *     description: Beneficiary statistics, demographics, and coverage
 */

/**
 * @swagger
 * /api/analytics/beneficiaries/stats:
 *   get:
 *     tags: [Beneficiaries]
 *     summary: Aggregated beneficiary stats
 *     description: Beneficiary counts grouped by district, scheme, block, state, or gender.
 *     parameters:
 *       - name: group_by
 *         in: query
 *         schema: { type: string, enum: [district, scheme_id, block, state, gender], default: district }
 *       - $ref: '#/components/parameters/District'
 *       - $ref: '#/components/parameters/SchemeId'
 *       - name: state
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Grouped statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 group_by: { type: string }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       total: { type: string }
 *                       active: { type: string }
 *                       inactive: { type: string }
 *                       avg_age: { type: string }
 *                       male: { type: string }
 *                       female: { type: string }
 *                       other_gender: { type: string }
 */
router.get(
  "/stats",
  validateEngineSecret,
  validateQuery(
    Joi.object({
      group_by: Joi.string().valid("district", "scheme_id", "block", "state", "gender").default("district"),
    })
  ),
  asyncHandler(async (req, res) => {
    const { district, scheme_id, state, group_by } = req.query;
    const params = [];
    const conditions = [];

    if (district)  { params.push(district);  conditions.push(`district = $${params.length}`); }
    if (scheme_id) { params.push(scheme_id); conditions.push(`scheme_id = $${params.length}`); }
    if (state)     { params.push(state);     conditions.push(`state = $${params.length}`); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT
         ${group_by},
         COUNT(*)                          AS total,
         COUNT(*) FILTER (WHERE is_active) AS active,
         COUNT(*) FILTER (WHERE NOT is_active) AS inactive,
         ROUND(AVG(age)::NUMERIC, 1)       AS avg_age,
         COUNT(*) FILTER (WHERE gender = 'M') AS male,
         COUNT(*) FILTER (WHERE gender = 'F') AS female,
         COUNT(*) FILTER (WHERE gender = 'O') AS other_gender
       FROM beneficiaries
       ${whereClause}
       GROUP BY ${group_by}
       ORDER BY total DESC`,
      params
    );

    return res.json({
      success: true,
      group_by,
      count: rows.length,
      data: rows,
    });
  })
);

/**
 * @swagger
 * /api/analytics/beneficiaries/distribution:
 *   get:
 *     tags: [Beneficiaries]
 *     summary: Demographics distribution
 *     description: Active beneficiary demographics broken down by age range, gender, scheme, and language.
 *     parameters:
 *       - $ref: '#/components/parameters/District'
 *       - $ref: '#/components/parameters/SchemeId'
 *     responses:
 *       200:
 *         description: Distribution buckets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     by_age: { type: array, items: { type: object, properties: { age_range: { type: string }, count: { type: string } } } }
 *                     by_gender: { type: array, items: { type: object, properties: { gender: { type: string }, count: { type: string } } } }
 *                     by_scheme: { type: array, items: { type: object, properties: { scheme_id: { type: string }, count: { type: string } } } }
 *                     by_language: { type: array, items: { type: object, properties: { language: { type: string }, count: { type: string } } } }
 */
router.get(
  "/distribution",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { district, scheme_id } = req.query;
    const params = [];
    const conditions = [`is_active = TRUE`];

    if (district)  { params.push(district);  conditions.push(`district = $${params.length}`); }
    if (scheme_id) { params.push(scheme_id); conditions.push(`scheme_id = $${params.length}`); }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [ageDistribution, genderDistribution, schemeDistribution, languageDistribution] = await Promise.all([
      pool.query(
        `SELECT
           CASE
             WHEN age < 30  THEN '18-29'
             WHEN age < 45  THEN '30-44'
             WHEN age < 60  THEN '45-59'
             WHEN age < 75  THEN '60-74'
             ELSE '75+'
           END AS age_range,
           COUNT(*) AS count
         FROM beneficiaries
         ${whereClause}
         GROUP BY age_range
         ORDER BY age_range`,
        params
      ),
      pool.query(
        `SELECT
           CASE gender WHEN 'M' THEN 'Male' WHEN 'F' THEN 'Female' ELSE 'Other' END AS gender,
           COUNT(*) AS count
         FROM beneficiaries
         ${whereClause}
         GROUP BY gender
         ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT
           scheme_id,
           COUNT(*) AS count
         FROM beneficiaries
         ${whereClause}
         GROUP BY scheme_id
         ORDER BY count DESC`,
        params
      ),
      pool.query(
        `SELECT
           COALESCE(language_pref, 'UNKNOWN') AS language,
           COUNT(*) AS count
         FROM beneficiaries
         ${whereClause}
         GROUP BY language_pref
         ORDER BY count DESC`,
        params
      ),
    ]);

    return res.json({
      success: true,
      data: {
        by_age:      ageDistribution.rows,
        by_gender:   genderDistribution.rows,
        by_scheme:   schemeDistribution.rows,
        by_language: languageDistribution.rows,
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/beneficiaries/coverage:
 *   get:
 *     tags: [Beneficiaries]
 *     summary: Response coverage
 *     description: Response rate vs enrolled beneficiaries per district×scheme.
 *     parameters:
 *       - $ref: '#/components/parameters/Days'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/District'
 *       - $ref: '#/components/parameters/SchemeId'
 *     responses:
 *       200:
 *         description: Coverage data
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
 *                       enrolled_beneficiaries: { type: integer }
 *                       total_responses: { type: integer }
 *                       avg_response_rate: { type: number, format: float }
 */
router.get(
  "/coverage",
  validateEngineSecret,
  validateQuery(),
  asyncHandler(async (req, res) => {
    const { days, start_date, end_date, district, scheme_id } = req.query;
    const params = [];
    const drConditions = [];
    const bConditions = [`b.is_active = TRUE`];

    if (start_date && end_date) {
      params.push(start_date, end_date);
      drConditions.push(`dr.date >= $1 AND dr.date <= $2`);
    } else {
      params.push(days || 7);
      drConditions.push(`dr.date >= CURRENT_DATE - ($1 || ' days')::INTERVAL`);
    }

    if (district) {
      params.push(district);
      drConditions.push(`dr.district = $${params.length}`);
      bConditions.push(`b.district = $${params.length}`);
    }
    if (scheme_id) {
      params.push(scheme_id);
      drConditions.push(`dr.scheme_id = $${params.length}`);
      bConditions.push(`b.scheme_id = $${params.length}`);
    }

    // Build separate params for beneficiaries query (no date param needed)
    const bParams = [];
    const bFilterConditions = [`b.is_active = TRUE`];
    if (district) {
      bParams.push(district);
      bFilterConditions.push(`b.district = $${bParams.length}`);
    }
    if (scheme_id) {
      bParams.push(scheme_id);
      bFilterConditions.push(`b.scheme_id = $${bParams.length}`);
    }

    const [responseData, beneficiaryData] = await Promise.all([
      pool.query(
        `SELECT
           district, scheme_id,
           SUM(total_responses) AS total_responses,
           SUM(active_beneficiaries) AS tracked_beneficiaries,
           ROUND(AVG(response_rate)::NUMERIC, 4) AS avg_response_rate
         FROM daily_responses dr
         WHERE ${drConditions.join(" AND ")}
         GROUP BY district, scheme_id
         ORDER BY avg_response_rate ASC`,
        params
      ),
      pool.query(
        `SELECT
           district, scheme_id,
           COUNT(*) AS enrolled_beneficiaries
         FROM beneficiaries b
         WHERE ${bFilterConditions.join(" AND ")}
         GROUP BY district, scheme_id`,
        bParams
      ),
    ]);

    // Merge the two datasets
    const coverageMap = {};
    for (const row of beneficiaryData.rows) {
      const key = `${row.district}|${row.scheme_id}`;
      coverageMap[key] = { ...row, total_responses: 0, avg_response_rate: 0 };
    }
    for (const row of responseData.rows) {
      const key = `${row.district}|${row.scheme_id}`;
      if (coverageMap[key]) {
        coverageMap[key].total_responses = parseInt(row.total_responses);
        coverageMap[key].avg_response_rate = parseFloat(row.avg_response_rate);
      } else {
        coverageMap[key] = { ...row, enrolled_beneficiaries: 0 };
      }
    }

    return res.json({
      success: true,
      count: Object.keys(coverageMap).length,
      data: Object.values(coverageMap),
    });
  })
);

module.exports = router;
