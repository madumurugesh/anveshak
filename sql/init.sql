-- =============================================================
-- Anveshak - Database Setup Script
-- Run on your RDS PostgreSQL instance ONCE before deploying.
-- WARNING: This drops and recreates all tables. Back up first.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility function used by analytics queries
CREATE OR REPLACE FUNCTION to_date_utc(ts TIMESTAMPTZ)
  RETURNS DATE LANGUAGE sql IMMUTABLE AS
$$SELECT (ts AT TIME ZONE 'UTC')::DATE$$;

-- Drop existing tables (cascade removes FK dependencies)
DROP TABLE IF EXISTS notification_log CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS dashboard_sessions CASCADE;
DROP TABLE IF EXISTS alert_actions CASCADE;
DROP TABLE IF EXISTS ai_prompt_log CASCADE;
DROP TABLE IF EXISTS anomaly_records CASCADE;
DROP TABLE IF EXISTS officers CASCADE;
DROP TABLE IF EXISTS district_baselines CASCADE;
DROP TABLE IF EXISTS daily_responses CASCADE;
DROP TABLE IF EXISTS rejected_responses CASCADE;
DROP TABLE IF EXISTS scheme_config CASCADE;
DROP TABLE IF EXISTS beneficiaries CASCADE;

-- ============================================================
-- 1. BENEFICIARIES  (used by Ingestion Service for lookup)
-- ============================================================
CREATE TABLE beneficiaries (
    beneficiary_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_hash          VARCHAR(64)     UNIQUE NOT NULL,
    name                VARCHAR(120)    NOT NULL,
    scheme_id           VARCHAR(20)     NOT NULL,       -- PDS | PM_KISAN | OLD_AGE_PENSION | LPG
    pincode             CHAR(6)         NOT NULL,
    block               VARCHAR(80),
    district            VARCHAR(80),
    state               VARCHAR(50),
    age                 INTEGER,
    gender              CHAR(1),                        -- M | F | O
    is_active           BOOLEAN         DEFAULT TRUE,
    language_pref       VARCHAR(5),                     -- TA | HI | TE | KN
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX idx_beneficiaries_phone_hash   ON beneficiaries (phone_hash);
CREATE INDEX idx_beneficiaries_pincode      ON beneficiaries (pincode);
CREATE INDEX idx_beneficiaries_district_sch ON beneficiaries (district, scheme_id);

-- ============================================================
-- 2. SCHEME_CONFIG  (used by Detector for thresholds)
-- ============================================================
CREATE TABLE scheme_config (
    scheme_id                   VARCHAR(20) PRIMARY KEY,
    scheme_name_en              VARCHAR(100),
    scheme_name_ta              VARCHAR(100),
    distribution_day_start      SMALLINT,
    distribution_day_end        SMALLINT,
    survey_window_days          SMALLINT,
    min_expected_response_rate  NUMERIC(4,3),
    is_active                   BOOLEAN     DEFAULT TRUE
);

-- ============================================================
-- 3. REJECTED_RESPONSES  (written by Ingestion Service)
-- ============================================================
CREATE TABLE rejected_responses (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    call_sid            VARCHAR(40),
    phone_hash          VARCHAR(64),
    scheme_id           VARCHAR(20),
    rejection_reason    VARCHAR(30),    -- UNREGISTERED | DUPLICATE | INVALID_INPUT | INACTIVE_BENEFICIARY
    raw_digit           CHAR(1),
    rejected_at         TIMESTAMPTZ     DEFAULT NOW()
);

-- ============================================================
-- 4. DAILY_RESPONSES  (written by Stream Processing flush)
-- ============================================================
CREATE TABLE daily_responses (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    date                 DATE           NOT NULL,
    pincode              CHAR(6)        NOT NULL,
    scheme_id            VARCHAR(20)    NOT NULL,
    block                VARCHAR(80),
    district             VARCHAR(80),
    state                VARCHAR(50),
    yes_count            INTEGER        DEFAULT 0,
    no_count             INTEGER        DEFAULT 0,
    total_responses      INTEGER        DEFAULT 0,
    no_pct               NUMERIC(5,4),          -- 0.0000 – 1.0000
    active_beneficiaries INTEGER,
    response_rate        NUMERIC(7,4),          -- can exceed 1.0 when total > beneficiaries
    created_at           TIMESTAMPTZ    DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    DEFAULT NOW()
);
-- Unique constraint for upsert from stream processing
CREATE UNIQUE INDEX uq_daily_pincode_scheme_date
    ON daily_responses (pincode, scheme_id, date);
CREATE INDEX idx_daily_date_district
    ON daily_responses (date, district);

-- ============================================================
-- 5. DISTRICT_BASELINES  (used by Detector)
-- ============================================================
CREATE TABLE district_baselines (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    district            VARCHAR(80)     NOT NULL,
    block               VARCHAR(80),
    scheme_id           VARCHAR(20)     NOT NULL,
    computed_date       DATE            NOT NULL,
    avg_no_pct          NUMERIC(5,4),
    std_dev_no_pct      NUMERIC(5,4),
    avg_total_responses NUMERIC(8,2),
    avg_response_rate   NUMERIC(5,4),
    sample_days         SMALLINT
);
CREATE INDEX idx_baselines_district_scheme
    ON district_baselines (district, scheme_id);

-- ============================================================
-- 6. ANOMALY_RECORDS  (written by Detector, updated by AI Engine)
-- ============================================================
CREATE TABLE anomaly_records (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    date                    DATE        NOT NULL,
    detector_type           VARCHAR(30) NOT NULL,   -- NO_SPIKE | SILENCE | DUPLICATE_BENEFICIARY | DISTRICT_ROLLUP
    level                   VARCHAR(15),            -- PINCODE | BLOCK | DISTRICT
    pincode                 CHAR(6),
    block                   VARCHAR(80),
    district                VARCHAR(80),
    state                   VARCHAR(50),
    scheme_id               VARCHAR(20),
    severity                VARCHAR(10),            -- CRITICAL | HIGH | MEDIUM | LOW
    score                   NUMERIC(8,4),
    no_pct                  NUMERIC(5,4),
    baseline_no_pct         NUMERIC(5,4),
    total_responses         INTEGER,
    affected_beneficiaries  INTEGER,
    raw_data                JSONB,
    ai_classification       VARCHAR(30),            -- SUPPLY_FAILURE | DEMAND_COLLAPSE | FRAUD_PATTERN | DATA_ARTIFACT | PENDING
    ai_confidence           NUMERIC(4,3),
    ai_reasoning            TEXT,
    ai_action               TEXT,
    ai_action_ta            TEXT,
    ai_urgency              VARCHAR(15),            -- TODAY | THIS_WEEK | MONITOR
    ai_processed_at         TIMESTAMPTZ,
    status                  VARCHAR(20) DEFAULT 'NEW',
    assigned_officer_id     UUID,
    assigned_at             TIMESTAMPTZ,
    resolved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_anomaly_date_district      ON anomaly_records (date, district);
CREATE INDEX idx_anomaly_severity_status    ON anomaly_records (severity, status);
CREATE INDEX idx_anomaly_scheme_date        ON anomaly_records (scheme_id, date);
CREATE INDEX idx_anomaly_ai_classification  ON anomaly_records (ai_classification);

-- ============================================================
-- 7. AI_PROMPT_LOG  (written by AI Anomaly Engine)
-- ============================================================
CREATE TABLE ai_prompt_log (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_record_id   UUID,
    lambda_name         VARCHAR(50),
    model               VARCHAR(30),
    prompt_tokens       INTEGER,
    completion_tokens   INTEGER,
    total_tokens        INTEGER,
    cost_usd            NUMERIC(10,6),
    prompt_text         TEXT,
    response_text       TEXT,
    success             BOOLEAN         DEFAULT TRUE,
    error_message       TEXT,
    latency_ms          INTEGER,
    called_at           TIMESTAMPTZ     DEFAULT NOW(),
    CONSTRAINT fk_ai_prompt_anomaly
        FOREIGN KEY (anomaly_record_id) REFERENCES anomaly_records(id) ON DELETE SET NULL
);
CREATE INDEX idx_ai_prompt_log_anomaly_id ON ai_prompt_log (anomaly_record_id);

-- ============================================================
-- 8. OFFICERS  (used by Analytics for assignment tracking)
-- ============================================================
CREATE TABLE officers (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(120)    NOT NULL,
    email               VARCHAR(150)    UNIQUE NOT NULL,
    role                VARCHAR(30)     NOT NULL,       -- DISTRICT_OFFICER | BLOCK_OFFICER | STATE_ADMIN
    district            VARCHAR(80),
    block               VARCHAR(80),
    state               VARCHAR(50),
    is_active           BOOLEAN         DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX idx_officers_district ON officers (district);

-- Add FK from anomaly_records to officers
ALTER TABLE anomaly_records
    ADD CONSTRAINT fk_anomaly_officer
    FOREIGN KEY (assigned_officer_id) REFERENCES officers(id) ON DELETE SET NULL;

-- ============================================================
-- 9. ALERT_ACTIONS  (used by Analytics for action timeline)
-- ============================================================
CREATE TABLE alert_actions (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_record_id    UUID           NOT NULL REFERENCES anomaly_records(id) ON DELETE CASCADE,
    officer_id           UUID           NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
    action_type          VARCHAR(30)    NOT NULL,       -- ASSIGNED | INVESTIGATING | FIELD_VISIT_STARTED | FIELD_VISIT_COMPLETED | ESCALATED | RESOLVED | NOTE_ADDED
    notes                TEXT,
    resolution_details   TEXT,
    field_visit_location TEXT,
    photos_s3_keys       TEXT[],
    created_at           TIMESTAMPTZ    DEFAULT NOW()
);
CREATE INDEX idx_alert_actions_anomaly  ON alert_actions (anomaly_record_id);
CREATE INDEX idx_alert_actions_officer  ON alert_actions (officer_id);
CREATE INDEX idx_alert_actions_created  ON alert_actions (created_at);

-- ============================================================
-- 10. DAILY_REPORTS  (used by Analytics reports endpoint)
-- ============================================================
CREATE TABLE daily_reports (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    district                VARCHAR(80) NOT NULL,
    report_date             DATE        NOT NULL,
    total_responses         INTEGER,
    total_anomalies         INTEGER,
    critical_count          INTEGER     DEFAULT 0,
    high_count              INTEGER     DEFAULT 0,
    medium_count            INTEGER     DEFAULT 0,
    schemes_summary         JSONB,
    best_performing_block   VARCHAR(80),
    worst_performing_pincode CHAR(6),
    pdf_s3_key              TEXT,
    email_sent              BOOLEAN     DEFAULT FALSE,
    email_sent_at           TIMESTAMPTZ,
    generated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_daily_reports_date     ON daily_reports (report_date);
CREATE INDEX idx_daily_reports_district ON daily_reports (district);

-- ============================================================
-- 11. NOTIFICATION_LOG  (used by Analytics reports detail)
-- ============================================================
CREATE TABLE notification_log (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id           UUID            REFERENCES daily_reports(id) ON DELETE SET NULL,
    channel             VARCHAR(20)     NOT NULL,       -- EMAIL | SMS | WHATSAPP
    message_type        VARCHAR(30),
    recipient_address   VARCHAR(200),
    delivered           BOOLEAN         DEFAULT FALSE,
    sent_at             TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX idx_notification_report ON notification_log (report_id);

-- ============================================================
-- 12. DASHBOARD_SESSIONS  (used by Analytics officer detail)
-- ============================================================
CREATE TABLE dashboard_sessions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_id          UUID            NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
    ip_address          INET,
    login_at            TIMESTAMPTZ     DEFAULT NOW(),
    last_active_at      TIMESTAMPTZ,
    logout_at           TIMESTAMPTZ
);
CREATE INDEX idx_sessions_officer ON dashboard_sessions (officer_id);


-- ============================================================
-- SEED: scheme_config
-- ============================================================
INSERT INTO scheme_config (scheme_id, scheme_name_en, scheme_name_ta, distribution_day_start, distribution_day_end, survey_window_days, min_expected_response_rate) VALUES
    ('PDS',             'Public Distribution System',  'பொது விநியோக முறை',       1,  5,  7, 0.200),
    ('PM_KISAN',        'PM Kisan Samman Nidhi',       'பிஎம் கிசான்',             1,  5, 10, 0.150),
    ('OLD_AGE_PENSION', 'Old Age Pension',             'முதியோர் ஓய்வூதியம்',      1,  3,  7, 0.100),
    ('LPG',             'LPG Subsidy (PAHAL/DBTL)',    'எல்பிஜி மானியம்',          1, 30, 30, 0.120);

-- ============================================================
-- SEED: beneficiaries (test data)
-- ============================================================
INSERT INTO beneficiaries (phone_hash, name, scheme_id, pincode, block, district, state, age, gender) VALUES
    ('hash_pds_001', 'Test Citizen 1',  'PDS',       '603001', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 34, 'F'),
    ('hash_pds_002', 'Test Citizen 2',  'PDS',       '603001', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 45, 'M'),
    ('hash_pds_003', 'Test Citizen 3',  'PDS',       '605001', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 52, 'M'),
    ('hash_pds_004', 'Test Citizen 4',  'PDS',       '605001', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 28, 'F'),
    ('hash_pds_005', 'Test Citizen 5',  'PDS',       '605001', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 61, 'M'),
    ('hash_pmk_001', 'Test Farmer 1',   'PM_KISAN',  '603003', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 40, 'M'),
    ('hash_pmk_002', 'Test Farmer 2',   'PM_KISAN',  '605004', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 38, 'F'),
    ('hash_oap_001', 'Test Elder 1',    'OLD_AGE_PENSION', '603005', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 72, 'M'),
    ('hash_lpg_001', 'Test LPG User 1', 'LPG',       '603007', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 30, 'F');

-- ============================================================
-- SEED: officers (test data for analytics)
-- ============================================================
INSERT INTO officers (id, name, email, role, district, block, state) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Priya Kumari',   'priya@tn.gov.in',    'DISTRICT_OFFICER', 'Chengalpattu', NULL,            'Tamil Nadu'),
    ('a0000000-0000-0000-0000-000000000002', 'Rajan Murugan',  'rajan@tn.gov.in',    'BLOCK_OFFICER',    'Chengalpattu', 'Madurantakam',  'Tamil Nadu'),
    ('a0000000-0000-0000-0000-000000000003', 'Selvi Devi',     'selvi@tn.gov.in',    'DISTRICT_OFFICER', 'Villupuram',   NULL,            'Tamil Nadu'),
    ('a0000000-0000-0000-0000-000000000004', 'Karthik Subash', 'karthik@tn.gov.in',  'STATE_ADMIN',      NULL,           NULL,            'Tamil Nadu');

-- ============================================================
-- SEED: district_baselines (so detectors work on first run)
-- ============================================================
INSERT INTO district_baselines (district, block, scheme_id, computed_date, avg_no_pct, std_dev_no_pct, avg_total_responses, avg_response_rate, sample_days) VALUES
    ('Chengalpattu', 'Madurantakam', 'PDS',       '2026-03-01', 0.2600, 0.0350, 38.00, 0.2600, 7),
    ('Chengalpattu', 'Madurantakam', 'PM_KISAN',  '2026-03-01', 0.2200, 0.0280, 22.00, 0.2200, 7),
    ('Villupuram',   'Vikravandi',   'PDS',        '2026-03-01', 0.3100, 0.1120, 44.00, 0.2400, 7),
    ('Villupuram',   'Vikravandi',   'PM_KISAN',   '2026-03-01', 0.2100, 0.0400, 18.00, 0.2000, 7),
    ('Chengalpattu', NULL,           'PDS',         '2026-03-01', 0.2500, 0.0320, 76.00, 0.2600, 7),
    ('Villupuram',   NULL,           'PDS',         '2026-03-01', 0.3000, 0.1000, 90.00, 0.2300, 7);