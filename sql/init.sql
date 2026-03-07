-- =============================================================
-- Run this on your RDS PostgreSQL instance ONCE before deploying
-- =============================================================

-- 1. Beneficiaries lookup table (used by the Ingestion Service)
CREATE TABLE IF NOT EXISTS beneficiaries (
    id BIGSERIAL PRIMARY KEY,
    phone_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hex digest
    name TEXT,
    pincode VARCHAR(6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_phone ON beneficiaries (phone_hash);

-- 2. Daily aggregated responses (written by the Stream Processing Service)
CREATE TABLE IF NOT EXISTS daily_responses (
    pincode VARCHAR(6) NOT NULL,
    scheme_id VARCHAR(64) NOT NULL,
    report_date DATE NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    response_sum INTEGER NOT NULL DEFAULT 0,
    no_pct NUMERIC(8, 4),
    z_score NUMERIC(8, 4),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (
        pincode,
        scheme_id,
        report_date
    )
);

-- 3. Anomaly reports (written by the Anomaly Detection Service)
CREATE TABLE IF NOT EXISTS anomaly_reports (
    id BIGSERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    flagged_count INTEGER NOT NULL DEFAULT 0,
    ai_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_reports_date ON anomaly_reports (report_date);