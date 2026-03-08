-- =============================================================
-- Anveshak AI Anomaly Engine - Database Schema
-- This is a SUBSET of the main sql/init.sql schema.
-- Run the main sql/init.sql first. This file is kept for
-- reference only - all tables are already created by init.sql.
-- =============================================================

-- Tables used by the AI Anomaly Engine:
--   anomaly_records  - read/update (detector writes, AI engine classifies)
--   ai_prompt_log    - write (logs every OpenAI call)
--   daily_responses  - read-only (for context in /stats endpoint)

-- If you need to set up the DB from scratch, run:
--   psql -h <host> -U <user> -d <db> -f sql/init.sql