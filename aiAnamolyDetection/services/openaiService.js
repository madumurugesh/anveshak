const OpenAI = require("openai");
const { v4: uuidv4 } = require("uuid");
const SYSTEM_PROMPT = require("../prompts/systemPrompt");
const pool = require("../config/db");
const logger = require("../config/logger");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: parseInt(process.env.OPENAI_TIMEOUT_MS || "15000"),
});

const MODEL       = process.env.OPENAI_MODEL       || "gpt-4o-mini";
const MAX_TOKENS  = parseInt(process.env.OPENAI_MAX_TOKENS  || "600");
const TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || "0.2");

// Validate AI JSON response shape
function validateAIResponse(parsed) {
  const REQUIRED = [
    "ai_classification",
    "ai_confidence",
    "ai_reasoning",
    "ai_action",
    "ai_action_ta",
    "ai_urgency",
    "signals_used",
    "confidence_adjustments",
  ];
  const VALID_CLASSIFICATIONS = [
    "SUPPLY_FAILURE", "DEMAND_COLLAPSE", "FRAUD_PATTERN", "DATA_ARTIFACT", "PENDING",
  ];
  const VALID_URGENCIES = ["TODAY", "THIS_WEEK", "MONITOR"];

  for (const field of REQUIRED) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  if (!VALID_CLASSIFICATIONS.includes(parsed.ai_classification)) {
    throw new Error(`Invalid ai_classification: ${parsed.ai_classification}`);
  }
  if (!VALID_URGENCIES.includes(parsed.ai_urgency)) {
    throw new Error(`Invalid ai_urgency: ${parsed.ai_urgency}`);
  }
  if (typeof parsed.ai_confidence !== "number" || parsed.ai_confidence <= 0 || parsed.ai_confidence >= 1) {
    throw new Error(`ai_confidence must be a float between 0.01 and 0.99, got: ${parsed.ai_confidence}`);
  }
  if (!Array.isArray(parsed.signals_used)) {
    throw new Error("signals_used must be an array");
  }
  if (!Array.isArray(parsed.confidence_adjustments)) {
    throw new Error("confidence_adjustments must be an array");
  }
}

// Call OpenAI and parse response
async function callOpenAI(anomaly) {
  const startMs = Date.now();
  let promptText = null;
  let responseText = null;
  let success = false;
  let errorMessage = null;
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  try {
    promptText = JSON.stringify(anomaly, null, 2);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      response_format: { type: "json_object" },  // force JSON mode
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: promptText },
      ],
    });

    responseText = completion.choices[0].message.content;
    usage = completion.usage || usage;
    const latencyMs = Date.now() - startMs;

    // Parse and validate
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      throw new Error(`OpenAI response is not valid JSON: ${parseErr.message}`);
    }

    validateAIResponse(parsed);
    success = true;

    logger.info("OpenAI call succeeded", {
      anomaly_id: anomaly.id,
      model: MODEL,
      latency_ms: latencyMs,
      total_tokens: usage.total_tokens,
      classification: parsed.ai_classification,
      confidence: parsed.ai_confidence,
    });

    return {
      result: parsed,
      meta: { promptText, responseText, usage, latencyMs, success, errorMessage: null },
    };

  } catch (err) {
    errorMessage = err.message;
    const latencyMs = Date.now() - startMs;

    logger.error("OpenAI call failed", {
      anomaly_id: anomaly.id,
      error: err.message,
      latency_ms: latencyMs,
    });

    return {
      result: null,
      meta: { promptText, responseText, usage, latencyMs, success: false, errorMessage },
    };
  }
}

// Write prompt log to DB
async function writePromptLog(anomalyId, meta) {
  const costUsd = estimateCost(meta.usage);
  try {
    await pool.query(
      `INSERT INTO ai_prompt_log (
        id, anomaly_record_id, lambda_name, model,
        prompt_tokens, completion_tokens, total_tokens, cost_usd,
        prompt_text, response_text, success, error_message, latency_ms, called_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12, $13, NOW()
      )`,
      [
        uuidv4(),
        anomalyId,
        "ai-anomaly-engine",
        MODEL,
        meta.usage.prompt_tokens,
        meta.usage.completion_tokens,
        meta.usage.total_tokens,
        costUsd,
        meta.promptText,
        meta.responseText,
        meta.success,
        meta.errorMessage,
        meta.latencyMs,
      ]
    );
  } catch (dbErr) {
    // Log but don't throw - prompt logging is non-critical
    logger.warn("Failed to write prompt log", { anomaly_id: anomalyId, error: dbErr.message });
  }
}

// Upsert anomaly record so FK dependencies (ai_prompt_log) are satisfied
// for records that arrive via the direct /classify endpoint (not pre-seeded in DB)
async function upsertAnomalyRecord(anomaly) {
  await pool.query(
    `INSERT INTO anomaly_records (
      id, date, detector_type, level, pincode, block, district, state,
      scheme_id, severity, score, no_pct, baseline_no_pct,
      total_responses, affected_beneficiaries, raw_data,
      ai_classification
    ) VALUES (
      $1, $2::DATE, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13,
      $14, $15, $16,
      'PENDING'
    )
    ON CONFLICT (id) DO NOTHING`,
    [
      anomaly.id,
      anomaly.date,
      anomaly.detector_type,
      anomaly.level,
      anomaly.pincode   || null,
      anomaly.block     || null,
      anomaly.district,
      anomaly.state     || null,
      anomaly.scheme_id,
      anomaly.severity,
      anomaly.score                  ?? null,
      anomaly.no_pct                 ?? null,
      anomaly.baseline_no_pct        ?? null,
      anomaly.total_responses        ?? null,
      anomaly.affected_beneficiaries ?? null,
      anomaly.raw_data ? JSON.stringify(anomaly.raw_data) : null,
    ]
  );
}

// Update anomaly_records with AI result
async function updateAnomalyRecord(anomalyId, result) {
  await pool.query(
    `UPDATE anomaly_records SET
      ai_classification  = $1,
      ai_confidence      = $2,
      ai_reasoning       = $3,
      ai_action          = $4,
      ai_action_ta       = $5,
      ai_urgency         = $6,
      ai_processed_at    = NOW()
    WHERE id = $7`,
    [
      result.ai_classification,
      result.ai_confidence,
      result.ai_reasoning,
      result.ai_action,
      result.ai_action_ta,
      result.ai_urgency,
      anomalyId,
    ]
  );
}

// Token cost estimation (gpt-4o-mini pricing as of 2024)
function estimateCost(usage) {
  const INPUT_COST_PER_1K  = 0.000150;   // $0.15 per 1M input tokens
  const OUTPUT_COST_PER_1K = 0.000600;   // $0.60 per 1M output tokens
  return (
    (usage.prompt_tokens     / 1000) * INPUT_COST_PER_1K +
    (usage.completion_tokens / 1000) * OUTPUT_COST_PER_1K
  );
}

// Public: classify a single anomaly
async function classifyAnomaly(anomaly) {
  // Ensure the row exists in anomaly_records before any FK-constrained writes
  // (handles records sent directly to /classify that aren't pre-seeded in the DB)
  try {
    await upsertAnomalyRecord(anomaly);
  } catch (dbErr) {
    logger.warn("Failed to upsert anomaly_records before classify", {
      anomaly_id: anomaly.id,
      error: dbErr.message,
    });
    // Non-fatal - continue with classification; updateAnomalyRecord will also handle it
  }

  const { result, meta } = await callOpenAI(anomaly);

  // Always log the prompt attempt
  await writePromptLog(anomaly.id, meta);

  if (!result) {
    return {
      success: false,
      anomaly_id: anomaly.id,
      error: meta.errorMessage,
    };
  }

  // Persist AI result back to anomaly_records
  try {
    await updateAnomalyRecord(anomaly.id, result);
  } catch (dbErr) {
    logger.error("Failed to update anomaly_records", {
      anomaly_id: anomaly.id,
      error: dbErr.message,
    });
    return {
      success: false,
      anomaly_id: anomaly.id,
      error: `DB write failed: ${dbErr.message}`,
    };
  }

  return {
    success: true,
    anomaly_id: anomaly.id,
    result,
    meta: {
      model: MODEL,
      total_tokens: meta.usage.total_tokens,
      latency_ms: meta.latencyMs,
      cost_usd: estimateCost(meta.usage),
    },
  };
}

// Public: classify a batch (sequential to respect rate limits)
async function classifyBatch(anomalies) {
  const results = [];
  for (let i = 0; i < anomalies.length; i++) {
    const result = await classifyAnomaly(anomalies[i]);
    results.push(result);
    // Small delay between calls to avoid OpenAI rate limit spikes
    if (i < anomalies.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return results;
}

module.exports = { classifyAnomaly, classifyBatch };