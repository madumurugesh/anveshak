const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Anveshak AI Anomaly Engine API",
      version: "1.0.0",
      description:
        "WelfareWatch AI Anomaly Classification Engine — classifies anomaly records using OpenAI, provides stats and processing endpoints.",
    },
    servers: [
      { url: "http://localhost:3002", description: "Local development" },
    ],
    components: {
      securitySchemes: {
        EngineSecret: {
          type: "apiKey",
          in: "header",
          name: "X-Engine-Secret",
          description: "Shared secret for service-to-service authentication",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
            details: { type: "array", items: { type: "string" } },
          },
        },
        AnomalyInput: {
          type: "object",
          required: ["id", "detector_type", "level", "district", "scheme_id", "severity", "score", "total_responses", "affected_beneficiaries", "raw_data", "date"],
          properties: {
            id: { type: "string", format: "uuid" },
            detector_type: { type: "string", enum: ["NO_SPIKE", "SILENCE", "DUPLICATE_BENEFICIARY", "DISTRICT_ROLLUP"] },
            level: { type: "string", enum: ["PINCODE", "BLOCK", "DISTRICT"] },
            pincode: { type: "string", pattern: "^\\d{6}$", nullable: true },
            block: { type: "string", maxLength: 80, nullable: true },
            district: { type: "string", maxLength: 80 },
            state: { type: "string", maxLength: 50, nullable: true },
            scheme_id: { type: "string", enum: ["PDS", "PM_KISAN", "OLD_AGE_PENSION", "LPG"] },
            severity: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
            score: { type: "number" },
            no_pct: { type: "number", minimum: 0, maximum: 1, nullable: true },
            baseline_no_pct: { type: "number", minimum: 0, maximum: 1, nullable: true },
            total_responses: { type: "integer", minimum: 0 },
            affected_beneficiaries: { type: "integer", minimum: 0 },
            raw_data: { type: "object" },
            date: { type: "string", format: "date" },
          },
        },
        ClassificationResult: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            anomaly_id: { type: "string", format: "uuid" },
            classification: { type: "string", enum: ["SUPPLY_FAILURE", "DEMAND_COLLAPSE", "FRAUD_PATTERN", "DATA_ARTIFACT"] },
            confidence: { type: "number" },
            reasoning: { type: "string" },
            recommended_action: { type: "string" },
            recommended_action_ta: { type: "string" },
            urgency: { type: "string", enum: ["TODAY", "THIS_WEEK", "MONITOR"] },
          },
        },
      },
    },
    security: [{ EngineSecret: [] }],
  },
  apis: ["./routes/*.js"],
};

module.exports = swaggerJsdoc(options);
