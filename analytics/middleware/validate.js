const Joi = require("joi");

/**
 * Validate internal engine secret header.
 * Returns 401 if missing, 403 if wrong.
 */
function validateEngineSecret(req, res, next) {
  const secret = req.headers["x-engine-secret"];
  if (!secret) {
    return res.status(401).json({ success: false, error: "Missing X-Engine-Secret header" });
  }
  if (secret !== process.env.ENGINE_SECRET) {
    return res.status(403).json({ success: false, error: "Invalid engine secret" });
  }
  next();
}

// ─── Common query-param schemas ─────────────────────────────

const dateRangeSchema = Joi.object({
  start_date: Joi.string().isoDate().optional(),
  end_date:   Joi.string().isoDate().optional(),
  days:       Joi.number().integer().min(1).max(365).default(7),
}).custom((value, helpers) => {
  if (value.start_date && value.end_date) {
    if (new Date(value.start_date) > new Date(value.end_date)) {
      return helpers.error("any.custom", { message: "start_date must be before end_date" });
    }
  }
  return value;
}, "date-range-validation")
.messages({ "any.custom": "{{#message}}" });

const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const filterSchema = Joi.object({
  district:          Joi.string().max(80).optional(),
  block:             Joi.string().max(80).optional(),
  state:             Joi.string().max(50).optional(),
  scheme_id:         Joi.string().valid("PDS", "PM_KISAN", "OLD_AGE_PENSION", "LPG").optional(),
  severity:          Joi.string().valid("CRITICAL", "HIGH", "MEDIUM", "LOW").optional(),
  status:            Joi.string().valid("NEW", "ASSIGNED", "INVESTIGATING", "FIELD_VISIT", "RESOLVED", "ESCALATED").optional(),
  ai_classification: Joi.string().valid("SUPPLY_FAILURE", "DEMAND_COLLAPSE", "FRAUD_PATTERN", "DATA_ARTIFACT", "PENDING").optional(),
  detector_type:     Joi.string().valid("NO_SPIKE", "SILENCE", "DUPLICATE_BENEFICIARY", "DISTRICT_ROLLUP").optional(),
  level:             Joi.string().valid("PINCODE", "BLOCK", "DISTRICT").optional(),
});

/**
 * Factory: validate query params against merged schema.
 * Merges dateRange + pagination + filters + any extra schemas.
 */
function validateQuery(...extraSchemas) {
  let merged = dateRangeSchema.concat(paginationSchema).concat(filterSchema);
  for (const s of extraSchemas) {
    merged = merged.concat(s);
  }

  return (req, res, next) => {
    const { error, value } = merged.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: error.details.map((d) => d.message),
      });
    }
    req.query = value;
    next();
  };
}

module.exports = {
  validateEngineSecret,
  validateQuery,
  dateRangeSchema,
  paginationSchema,
  filterSchema,
};
