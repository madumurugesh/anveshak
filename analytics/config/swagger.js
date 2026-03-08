const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Anveshak Analytics API",
      version: "1.0.0",
      description:
        "WelfareWatch Analytics & Dashboard API — dashboard metrics, anomaly browsing, reports, officers, beneficiaries, schemes, responses, and AI usage tracking.",
    },
    servers: [
      { url: "http://localhost:3001", description: "Local development" },
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
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 150 },
            total_pages: { type: "integer", example: 8 },
          },
        },
      },
      parameters: {
        Days: {
          name: "days",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 365, default: 7 },
          description: "Number of past days to query",
        },
        StartDate: {
          name: "start_date",
          in: "query",
          schema: { type: "string", format: "date" },
          description: "Start date (ISO 8601). Use with end_date instead of days.",
        },
        EndDate: {
          name: "end_date",
          in: "query",
          schema: { type: "string", format: "date" },
          description: "End date (ISO 8601). Use with start_date instead of days.",
        },
        Page: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        Limit: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Results per page (max 100)",
        },
        District: {
          name: "district",
          in: "query",
          schema: { type: "string", maxLength: 80 },
          description: "Filter by district name",
        },
        SchemeId: {
          name: "scheme_id",
          in: "query",
          schema: { type: "string", enum: ["PDS", "PM_KISAN", "OLD_AGE_PENSION", "LPG"] },
          description: "Filter by scheme",
        },
      },
    },
    security: [{ EngineSecret: [] }],
  },
  apis: ["./routes/*.js"],
};

module.exports = swaggerJsdoc(options);
