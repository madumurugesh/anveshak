require("dotenv").config();

const express     = require("express");
const helmet      = require("helmet");
const cors        = require("cors");
const compression = require("compression");
const { v4: uuidv4 } = require("uuid");
const rateLimit   = require("express-rate-limit");
const logger      = require("./config/logger");
const pool        = require("./config/db");
const swaggerSpec = require("./config/swagger");
const swaggerUi   = require("swagger-ui-express");

// Route modules
const dashboardRoutes    = require("./routes/dashboard");
const anomaliesRoutes    = require("./routes/anomalies");
const reportsRoutes      = require("./routes/reports");
const officersRoutes     = require("./routes/officers");
const beneficiariesRoutes = require("./routes/beneficiaries");
const schemesRoutes      = require("./routes/schemes");
const responsesRoutes    = require("./routes/responses");
const aiRoutes           = require("./routes/ai");

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Security headers ───────────────────────────────────────
app.use(helmet());

// ─── CORS ───────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*")) {
        return cb(null, true);
      }
      cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Engine-Secret", "X-Request-ID", "Authorization"],
    exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining"],
    credentials: true,
    maxAge: 86400,
  })
);

// ─── Compression ────────────────────────────────────────────
app.use(compression());

// ─── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: "256kb" }));

// ─── Request ID & logger ────────────────────────────────────
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-ID", req.id);
  logger.info(`${req.method} ${req.path}`, {
    request_id: req.id,
    ip: req.ip,
    user_agent: req.headers["user-agent"],
  });
  next();
});

// ─── Rate limiter ───────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
    max:      parseInt(process.env.RATE_LIMIT_MAX || "120"),
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, error: "Too many requests - slow down" },
  })
);

// ─── Cognito JWT validation (passes through if no JWT or Cognito not configured) ──
const { validateCognitoJwt } = require("./middleware/cognitoAuth");
app.use(validateCognitoJwt);

// ─── Swagger UI ─────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "Anveshak Analytics API Docs" }));
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

// ─── Routes ─────────────────────────────────────────────────
app.use("/api/analytics/dashboard",     dashboardRoutes);
app.use("/api/analytics/anomalies",     anomaliesRoutes);
app.use("/api/analytics/reports",       reportsRoutes);
app.use("/api/analytics/officers",      officersRoutes);
app.use("/api/analytics/beneficiaries", beneficiariesRoutes);
app.use("/api/analytics/schemes",       schemesRoutes);
app.use("/api/analytics/responses",     responsesRoutes);
app.use("/api/analytics/ai",           aiRoutes);

// ─── Health check ───────────────────────────────────────────
app.get("/health", async (req, res) => {
  let dbStatus = "ok";
  try {
    await pool.query("SELECT 1");
  } catch {
    dbStatus = "error";
  }
  res.status(dbStatus === "ok" ? 200 : 503).json({
    status: dbStatus === "ok" ? "healthy" : "degraded",
    service: "analytics-engine",
    timestamp: new Date().toISOString(),
    services: { database: dbStatus },
  });
});

// ─── 404 handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global error handler ───────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error("Unhandled error", {
    request_id: req.id,
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });

  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ success: false, error: err.message });
  }

  res.status(500).json({ success: false, error: "Internal server error" });
});

// ─── Start & graceful shutdown ──────────────────────────────
const server = app.listen(PORT, async () => {
  logger.info(`WelfareWatch Analytics Engine started`, {
    port: PORT,
    env: process.env.NODE_ENV,
    cors_origins: ALLOWED_ORIGINS,
  });

  try {
    await pool.query("SELECT 1");
    logger.info("Database connection verified");
  } catch (err) {
    logger.error("Database connection failed on startup", { error: err.message });
  }
});

function shutdown(signal) {
  logger.info(`${signal} received - shutting down gracefully`);
  server.close(async () => {
    try {
      await pool.end();
      logger.info("DB pool drained");
    } catch (e) {
      logger.error("Error draining DB pool", { error: e.message });
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

module.exports = app;
