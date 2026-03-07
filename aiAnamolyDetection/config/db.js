const { Pool } = require("pg");
const logger = require("./logger");

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10,                  // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  logger.error("Unexpected DB pool error", { error: err.message });
});

pool.on("connect", () => {
  logger.debug("New DB connection established");
});

module.exports = pool;