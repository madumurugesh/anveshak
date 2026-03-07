const Joi = require("joi");

// Schema for a single anomaly record
const anomalySchema = Joi.object({
  id:                     Joi.string().uuid().required(),
  detector_type:          Joi.string().valid("NO_SPIKE", "SILENCE", "DUPLICATE_BENEFICIARY", "DISTRICT_ROLLUP").required(),
  level:                  Joi.string().valid("PINCODE", "BLOCK", "DISTRICT").required(),
  pincode:                Joi.string().length(6).pattern(/^\d{6}$/).allow(null).default(null),
  block:                  Joi.string().max(80).allow(null).default(null),
  district:               Joi.string().max(80).required(),
  state:                  Joi.string().max(50).allow(null, "").default(null),
  scheme_id:              Joi.string().valid("PDS", "PM_KISAN", "OLD_AGE_PENSION", "LPG").required(),
  severity:               Joi.string().valid("CRITICAL", "HIGH", "MEDIUM", "LOW").required(),
  score:                  Joi.number().required(),
  no_pct:                 Joi.number().min(0).max(1).allow(null).default(null),
  baseline_no_pct:        Joi.number().min(0).max(1).allow(null).default(null),
  total_responses:        Joi.number().integer().min(0).required(),
  affected_beneficiaries: Joi.number().integer().min(0).required(),
  raw_data:               Joi.object().required(),
  date:                   Joi.string().isoDate().required(),
})
.custom((value, helpers) => {
  // PINCODE level must have a valid pincode
  if (value.level === "PINCODE" && !value.pincode) {
    return helpers.error("any.custom", { message: "pincode is required when level is PINCODE" });
  }
  // PINCODE and BLOCK levels must have a block name
  if ((value.level === "PINCODE" || value.level === "BLOCK") && !value.block) {
    return helpers.error("any.custom", { message: "block is required when level is PINCODE or BLOCK" });
  }
  return value;
}, "level-specific validation")
.messages({
  "any.custom": "{{#message}}",
});

// Schema for batch endpoint
const batchSchema = Joi.object({
  anomalies: Joi.array().items(anomalySchema).min(1).max(
    parseInt(process.env.BATCH_SIZE || "5")
  ).required(),
});

/**
 * Validate a single anomaly record in the request body
 */
function validateAnomaly(req, res, next) {
  const { error, value } = anomalySchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
}

/**
 * Validate a batch of anomaly records
 */
function validateBatch(req, res, next) {
  const { error, value } = batchSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: "Batch validation failed",
      details: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
}

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

module.exports = { validateAnomaly, validateBatch, validateEngineSecret };