-- ============================================================
-- WelfareWatch - Complete Database Schema
-- PostgreSQL DDL + DynamoDB mock inserts as seed data
-- Layers: Edge → Ingest → Detection → AI → Alert → Dashboard
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Immutable helper: extract DATE from TIMESTAMPTZ at UTC
-- Required because TIMESTAMPTZ::DATE is STABLE (timezone-dependent),
-- but expression indexes require IMMUTABLE functions.
CREATE OR REPLACE FUNCTION to_date_utc(ts TIMESTAMPTZ)
RETURNS DATE AS $$
  SELECT (ts AT TIME ZONE 'UTC')::DATE;
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;


-- ============================================================
-- LAYER: EDGE
-- ============================================================

-- DynamoDB: ivr_sessions (represented as a PG table for reference)
-- In production this lives in DynamoDB with TTL = 300s
CREATE TABLE IF NOT EXISTS ivr_sessions (
    call_sid        VARCHAR(64)     PRIMARY KEY,         -- Twilio CallSid - unique per call
    phone_hash      VARCHAR(64)     NOT NULL,            -- SHA-256 of caller number
    scheme_id       VARCHAR(20),                         -- PDS | PM_KISAN | OLD_AGE_PENSION | LPG
    step            VARCHAR(30),                         -- SCHEME_SELECTED | COMPLETED | TIMED_OUT | INVALID
    step1_digit     CHAR(1),                             -- Raw digit pressed for scheme (1-4)
    step1_ts        TIMESTAMPTZ,                         -- Timestamp of scheme selection
    language        VARCHAR(5),                          -- TA | HI | TE | KN
    ttl             BIGINT,                              -- Unix epoch + 300s (DynamoDB TTL)
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);


-- ============================================================
-- LAYER: INGEST
-- ============================================================

-- DynamoDB: responses (windowed counters - represented as PG table for reference)
CREATE TABLE IF NOT EXISTS responses_dynamo_ref (
    pk              VARCHAR(60)     NOT NULL,            -- pincode#scheme_id  e.g. 607001#PDS
    sk              VARCHAR(30)     NOT NULL,            -- date#window_hour   e.g. 2024-11-19#18
    yes_count       INTEGER         DEFAULT 0,
    no_count        INTEGER         DEFAULT 0,
    total           INTEGER         DEFAULT 0,
    district        VARCHAR(80),
    block           VARCHAR(80),
    state           VARCHAR(50),
    last_updated    TIMESTAMPTZ,
    PRIMARY KEY (pk, sk)
);
CREATE INDEX IF NOT EXISTS idx_responses_dynamo_district_date ON responses_dynamo_ref (district, (LEFT(sk, 10)));

-- DynamoDB: response_dedup (exactly-one-per-day enforcement)
CREATE TABLE IF NOT EXISTS response_dedup (
    pk              VARCHAR(150)    PRIMARY KEY,         -- phone_hash#scheme_id#date
    response        VARCHAR(5),                          -- YES | NO
    channel         VARCHAR(20),                         -- IVR_MISSEDCALL | SMS | IVR_OUTBOUND
    call_sid        VARCHAR(64),
    timestamp       TIMESTAMPTZ,
    ttl             BIGINT                               -- Unix epoch + 86400s
);
CREATE INDEX IF NOT EXISTS idx_response_dedup_phone_date ON response_dedup ((SPLIT_PART(pk, '#', 1)), (SPLIT_PART(pk, '#', 3)));

-- DynamoDB: baselines_cache (7-day rolling daily totals)
CREATE TABLE IF NOT EXISTS baselines_cache (
    pk              VARCHAR(60)     NOT NULL,            -- pincode#scheme_id
    sk              VARCHAR(12)     NOT NULL,            -- date  e.g. 2024-11-19
    no_pct          NUMERIC(5,4),                        -- Daily NO% (0.0 to 1.0)
    yes_pct         NUMERIC(5,4),                        -- Daily YES% (0.0 to 1.0)
    total           INTEGER,
    ttl             BIGINT,                              -- Unix epoch + 691200s (8 days)
    PRIMARY KEY (pk, sk)
);

-- RDS: beneficiaries
CREATE TABLE IF NOT EXISTS beneficiaries (
    beneficiary_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_hash          VARCHAR(64)     UNIQUE NOT NULL,
    name                VARCHAR(120)    NOT NULL,
    scheme_id           VARCHAR(20)     NOT NULL,        -- PDS | PM_KISAN | OLD_AGE_PENSION | LPG
    pincode             CHAR(6)         NOT NULL,
    block               VARCHAR(80),
    district            VARCHAR(80),
    state               VARCHAR(50),
    ration_card_number  VARCHAR(20),                     -- PDS only
    aadhaar_last4       CHAR(4),
    gender              CHAR(1),                         -- M | F | O
    age                 SMALLINT,
    is_active           BOOLEAN         DEFAULT TRUE,
    enrolled_date       DATE,
    language_pref       VARCHAR(5),                      -- TA | HI | TE | KN
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_phone_hash_scheme  ON beneficiaries (phone_hash, scheme_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_pincode            ON beneficiaries (pincode);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_district_scheme    ON beneficiaries (district, scheme_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_is_active          ON beneficiaries (is_active);

-- RDS: scheme_config
CREATE TABLE IF NOT EXISTS scheme_config (
    scheme_id                   VARCHAR(20)     PRIMARY KEY,
    scheme_name_en              VARCHAR(100),
    scheme_name_ta              VARCHAR(100),
    ivr_digit                   CHAR(1),
    survey_question_en          TEXT,
    survey_question_ta          TEXT,
    survey_question_hi          TEXT,
    distribution_day_start      SMALLINT,
    distribution_day_end        SMALLINT,
    survey_window_days          SMALLINT,
    min_expected_response_rate  NUMERIC(4,3),
    audio_menu_key_ta           VARCHAR(200),
    audio_question_key_ta       VARCHAR(200),
    is_active                   BOOLEAN         DEFAULT TRUE
);

-- RDS: rejected_responses
CREATE TABLE IF NOT EXISTS rejected_responses (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    call_sid            VARCHAR(40),
    phone_hash          VARCHAR(64),
    scheme_id           VARCHAR(20),
    rejection_reason    VARCHAR(30),                     -- UNREGISTERED | DUPLICATE | INVALID_INPUT | INACTIVE_BENEFICIARY
    raw_digit           CHAR(1),
    rejected_at         TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rejected_date            ON rejected_responses (to_date_utc(rejected_at));
CREATE INDEX IF NOT EXISTS idx_rejected_reason_scheme   ON rejected_responses (rejection_reason, scheme_id);


-- ============================================================
-- LAYER: DETECTION
-- ============================================================

-- RDS: daily_responses
CREATE TABLE IF NOT EXISTS daily_responses (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    date                DATE            NOT NULL,
    pincode             CHAR(6)         NOT NULL,
    scheme_id           VARCHAR(20)     NOT NULL,
    block               VARCHAR(80),
    district            VARCHAR(80),
    state               VARCHAR(50),
    yes_count           INTEGER         DEFAULT 0,
    no_count            INTEGER         DEFAULT 0,
    total_responses     INTEGER         DEFAULT 0,
    no_pct              NUMERIC(5,4),
    active_beneficiaries INTEGER,
    response_rate       NUMERIC(5,4),
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_responses_date_district        ON daily_responses (date, district);
CREATE INDEX IF NOT EXISTS idx_daily_responses_pincode_scheme_date  ON daily_responses (pincode, scheme_id, date);

-- RDS: district_baselines
CREATE TABLE IF NOT EXISTS district_baselines (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    district            VARCHAR(80)     NOT NULL,
    block               VARCHAR(80),
    scheme_id           VARCHAR(20)     NOT NULL,
    computed_date       DATE            NOT NULL,        -- Sunday of the week
    avg_no_pct          NUMERIC(5,4),
    std_dev_no_pct      NUMERIC(5,4),
    avg_total_responses NUMERIC(8,2),
    avg_response_rate   NUMERIC(5,4),
    sample_days         SMALLINT
);
CREATE INDEX IF NOT EXISTS idx_district_baselines_district_scheme   ON district_baselines (district, scheme_id);
CREATE INDEX IF NOT EXISTS idx_district_baselines_block_scheme      ON district_baselines (block, scheme_id);

-- RDS: anomaly_records
CREATE TABLE IF NOT EXISTS anomaly_records (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    date                    DATE            NOT NULL,
    detector_type           VARCHAR(30)     NOT NULL,    -- NO_SPIKE | SILENCE | DUPLICATE_BENEFICIARY | DISTRICT_ROLLUP
    level                   VARCHAR(15),                 -- PINCODE | BLOCK | DISTRICT
    pincode                 CHAR(6),
    block                   VARCHAR(80),
    district                VARCHAR(80),
    state                   VARCHAR(50),
    scheme_id               VARCHAR(20),
    severity                VARCHAR(10),                 -- CRITICAL | HIGH | MEDIUM | LOW
    score                   NUMERIC(8,4),
    no_pct                  NUMERIC(5,4),
    baseline_no_pct         NUMERIC(5,4),
    total_responses         INTEGER,
    affected_beneficiaries  INTEGER,
    raw_data                JSONB,
    ai_classification       VARCHAR(30),                 -- SUPPLY_FAILURE | DEMAND_COLLAPSE | FRAUD_PATTERN | DATA_ARTIFACT | PENDING | NULL
    ai_confidence           NUMERIC(4,3),
    ai_reasoning            TEXT,
    ai_action               TEXT,
    ai_action_ta            TEXT,
    ai_urgency              VARCHAR(15),                 -- TODAY | THIS_WEEK | MONITOR
    ai_processed_at         TIMESTAMPTZ,
    status                  VARCHAR(20)     DEFAULT 'NEW', -- NEW | ASSIGNED | INVESTIGATING | FIELD_VISIT | RESOLVED | ESCALATED
    assigned_officer_id     UUID,
    assigned_at             TIMESTAMPTZ,
    resolved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anomaly_date_district        ON anomaly_records (date, district);
CREATE INDEX IF NOT EXISTS idx_anomaly_severity_status      ON anomaly_records (severity, status);
CREATE INDEX IF NOT EXISTS idx_anomaly_scheme_date          ON anomaly_records (scheme_id, date);
CREATE INDEX IF NOT EXISTS idx_anomaly_pincode_date         ON anomaly_records (pincode, date);
CREATE INDEX IF NOT EXISTS idx_anomaly_ai_classification    ON anomaly_records (ai_classification);
CREATE INDEX IF NOT EXISTS idx_anomaly_detector_type        ON anomaly_records (detector_type);


-- ============================================================
-- LAYER: AI
-- ============================================================

-- RDS: ai_prompt_log
CREATE TABLE IF NOT EXISTS ai_prompt_log (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_record_id   UUID,                            -- FK → anomaly_records.id
    lambda_name         VARCHAR(50),                     -- ai-interpreter | ai-action-advisor | ai-report-writer
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
    CONSTRAINT fk_ai_prompt_anomaly FOREIGN KEY (anomaly_record_id) REFERENCES anomaly_records(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_log_anomaly_id ON ai_prompt_log (anomaly_record_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_log_date       ON ai_prompt_log (to_date_utc(called_at));

-- RDS: daily_reports
CREATE TABLE IF NOT EXISTS daily_reports (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    district                VARCHAR(80)     NOT NULL,
    report_date             DATE            NOT NULL,
    narrative_text          TEXT,
    total_responses         INTEGER,
    total_anomalies         INTEGER,
    critical_count          INTEGER         DEFAULT 0,
    high_count              INTEGER         DEFAULT 0,
    medium_count            INTEGER         DEFAULT 0,
    schemes_summary         JSONB,
    best_performing_block   VARCHAR(80),
    worst_performing_pincode CHAR(6),
    pdf_s3_key              VARCHAR(300),
    email_sent              BOOLEAN         DEFAULT FALSE,
    email_sent_at           TIMESTAMPTZ,
    generated_at            TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_reports_district_date ON daily_reports (district, report_date);


-- ============================================================
-- LAYER: ALERT
-- ============================================================

-- RDS: alert_actions
CREATE TABLE IF NOT EXISTS alert_actions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_record_id       UUID            NOT NULL,    -- FK → anomaly_records.id
    officer_id              UUID            NOT NULL,    -- FK → officers.id
    action_type             VARCHAR(25),                 -- ASSIGNED | ACKNOWLEDGED | FIELD_VISIT_STARTED | FIELD_VISIT_COMPLETED | ESCALATED | RESOLVED | REOPENED
    notes                   TEXT,
    resolution_details      TEXT,
    field_visit_location    VARCHAR(200),
    photos_s3_keys          TEXT[],
    created_at              TIMESTAMPTZ     DEFAULT NOW(),
    CONSTRAINT fk_alert_action_anomaly FOREIGN KEY (anomaly_record_id) REFERENCES anomaly_records(id)
);
CREATE INDEX IF NOT EXISTS idx_alert_actions_anomaly_id  ON alert_actions (anomaly_record_id);
CREATE INDEX IF NOT EXISTS idx_alert_actions_officer_id  ON alert_actions (officer_id);
CREATE INDEX IF NOT EXISTS idx_alert_actions_created_at  ON alert_actions (created_at);

-- RDS: notification_log
CREATE TABLE IF NOT EXISTS notification_log (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_record_id       UUID,                        -- FK → anomaly_records.id (NULL for digest)
    report_id               UUID,                        -- FK → daily_reports.id (NULL for alert)
    channel                 VARCHAR(10),                 -- EMAIL | SMS
    recipient_officer_id    UUID,
    recipient_address       VARCHAR(200),
    message_type            VARCHAR(20),                 -- CRITICAL_ALERT | HIGH_ALERT | DAILY_DIGEST
    sns_message_id          VARCHAR(100),
    ses_message_id          VARCHAR(100),
    delivered               BOOLEAN         DEFAULT FALSE,
    sent_at                 TIMESTAMPTZ     DEFAULT NOW(),
    CONSTRAINT fk_notif_anomaly FOREIGN KEY (anomaly_record_id) REFERENCES anomaly_records(id) ON DELETE SET NULL,
    CONSTRAINT fk_notif_report  FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_notification_log_anomaly_id  ON notification_log (anomaly_record_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at     ON notification_log (sent_at);


-- ============================================================
-- LAYER: DASHBOARD
-- ============================================================

-- RDS: officers
CREATE TABLE IF NOT EXISTS officers (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub     VARCHAR(100)    UNIQUE NOT NULL,
    name            VARCHAR(120),
    email           VARCHAR(200)    UNIQUE NOT NULL,
    phone_hash      VARCHAR(64),
    role            VARCHAR(25),                         -- BLOCK_OFFICER | DISTRICT_COLLECTOR | STATE_MONITOR | CENTRAL_MIS
    district        VARCHAR(80),
    block           VARCHAR(80),
    state           VARCHAR(50),
    is_active       BOOLEAN         DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_officers_cognito_sub      ON officers (cognito_sub);
CREATE INDEX IF NOT EXISTS idx_officers_district_role    ON officers (district, role);

-- RDS: dashboard_sessions
CREATE TABLE IF NOT EXISTS dashboard_sessions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    officer_id          UUID            NOT NULL,        -- FK → officers.id
    ip_address          INET,
    user_agent          TEXT,
    login_at            TIMESTAMPTZ     DEFAULT NOW(),
    last_active_at      TIMESTAMPTZ,
    logout_at           TIMESTAMPTZ,
    CONSTRAINT fk_session_officer FOREIGN KEY (officer_id) REFERENCES officers(id)
);
CREATE INDEX IF NOT EXISTS idx_dashboard_sessions_officer_id ON dashboard_sessions (officer_id);


-- ============================================================
-- DEFERRED FOREIGN KEY CONSTRAINTS
-- (Added after all tables are created)
-- ============================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_anomaly_officer') THEN
        ALTER TABLE anomaly_records
            ADD CONSTRAINT fk_anomaly_officer
            FOREIGN KEY (assigned_officer_id) REFERENCES officers(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_alert_officer') THEN
        ALTER TABLE alert_actions
            ADD CONSTRAINT fk_alert_officer
            FOREIGN KEY (officer_id) REFERENCES officers(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notif_officer') THEN
        ALTER TABLE notification_log
            ADD CONSTRAINT fk_notif_officer
            FOREIGN KEY (recipient_officer_id) REFERENCES officers(id) ON DELETE SET NULL;
    END IF;
END $$;


-- ============================================================
-- SEED DATA - scheme_config (structured)
-- ============================================================

INSERT INTO scheme_config (
    scheme_id, scheme_name_en, scheme_name_ta, ivr_digit,
    survey_question_en, survey_question_ta, survey_question_hi,
    distribution_day_start, distribution_day_end, survey_window_days,
    min_expected_response_rate, audio_menu_key_ta, audio_question_key_ta, is_active
) VALUES
(
    'PDS',
    'Public Distribution System',
    'பொது விநியோக முறை',
    '1',
    'Did you receive your monthly ration this month? Press 1 for Yes, 2 for No.',
    'இந்த மாதம் உங்கள் மாத ரேஷன் கிடைத்ததா? ஆம் என்றால் 1, இல்லை என்றால் 2 அழுத்தவும்.',
    'क्या आपको इस महीने आपका मासिक राशन मिला? हाँ के लिए 1, नहीं के लिए 2 दबाएं।',
    1, 5, 7, 0.300,
    'welfarewatch-config/ivrscripts/PDS_menu_TA.mp3',
    'welfarewatch-config/ivrscripts/PDS_question_TA.mp3',
    TRUE
),
(
    'PM_KISAN',
    'PM Kisan Samman Nidhi',
    'பிரதம மந்திரி கிசான் சம்மான் நிதி',
    '2',
    'Did you receive the PM Kisan instalment this quarter? Press 1 for Yes, 2 for No.',
    'இந்த காலாண்டில் PM கிசான் தவணை கிடைத்ததா? ஆம் என்றால் 1, இல்லை என்றால் 2 அழுத்தவும்.',
    'क्या आपको इस तिमाही PM किसान किस्त मिली? हाँ के लिए 1, नहीं के लिए 2 दबाएं।',
    1, 7, 10, 0.250,
    'welfarewatch-config/ivrscripts/PM_KISAN_menu_TA.mp3',
    'welfarewatch-config/ivrscripts/PM_KISAN_question_TA.mp3',
    TRUE
),
(
    'OLD_AGE_PENSION',
    'Old Age Pension Scheme',
    'வயதான காலத்திற்கான ஓய்வூதியம்',
    '3',
    'Did you receive your pension amount this month? Press 1 for Yes, 2 for No.',
    'இந்த மாதம் உங்கள் ஓய்வூதியத் தொகை கிடைத்ததா? ஆம் என்றால் 1, இல்லை என்றால் 2 அழுத்தவும்.',
    'क्या आपको इस महीने आपकी पेंशन राशि मिली? हाँ के लिए 1, नहीं के लिए 2 दबाएं।',
    1, 3, 5, 0.400,
    'welfarewatch-config/ivrscripts/OLD_AGE_PENSION_menu_TA.mp3',
    'welfarewatch-config/ivrscripts/OLD_AGE_PENSION_question_TA.mp3',
    TRUE
),
(
    'LPG',
    'LPG Subsidy Scheme',
    'எல்பிஜி மானியத் திட்டம்',
    '4',
    'Did you receive your LPG subsidy in your bank account this month? Press 1 for Yes, 2 for No.',
    'இந்த மாதம் உங்கள் வங்கி கணக்கில் LPG மானியம் கிடைத்ததா? ஆம் என்றால் 1, இல்லை என்றால் 2 அழுத்தவும்.',
    'क्या आपको इस महीने आपके बैंक खाते में LPG सब्सिडी मिली? हाँ के लिए 1, नहीं के लिए 2 दबाएं।',
    5, 10, 7, 0.200,
    'welfarewatch-config/ivrscripts/LPG_menu_TA.mp3',
    'welfarewatch-config/ivrscripts/LPG_question_TA.mp3',
    TRUE
);


-- ============================================================
-- SEED DATA - officers (mock)
-- ============================================================

INSERT INTO officers (id, cognito_sub, name, email, phone_hash, role, district, block, state, is_active) VALUES
(
    '11111111-0000-0000-0000-000000000001',
    'cognito-sub-central-001',
    'Priya Rangan',
    'priya.rangan@welfare.gov.in',
    'a1b2c3d4e5f60000000000000000000000000000000000000000000000000001',
    'CENTRAL_MIS',
    NULL, NULL, 'Tamil Nadu', TRUE
),
(
    '11111111-0000-0000-0000-000000000002',
    'cognito-sub-state-001',
    'Karthikeyan S',
    'karthikeyan.s@tn.welfare.gov.in',
    'a1b2c3d4e5f60000000000000000000000000000000000000000000000000002',
    'STATE_MONITOR',
    NULL, NULL, 'Tamil Nadu', TRUE
),
(
    '11111111-0000-0000-0000-000000000003',
    'cognito-sub-dist-001',
    'Meena Krishnan',
    'meena.krishnan@chengalpattu.gov.in',
    'a1b2c3d4e5f60000000000000000000000000000000000000000000000000003',
    'DISTRICT_COLLECTOR',
    'Chengalpattu', NULL, 'Tamil Nadu', TRUE
),
(
    '11111111-0000-0000-0000-000000000004',
    'cognito-sub-dist-002',
    'Ramesh Babu',
    'ramesh.babu@villupuram.gov.in',
    'a1b2c3d4e5f60000000000000000000000000000000000000000000000000004',
    'DISTRICT_COLLECTOR',
    'Villupuram', NULL, 'Tamil Nadu', TRUE
),
(
    '11111111-0000-0000-0000-000000000005',
    'cognito-sub-block-001',
    'Anitha Devi',
    'anitha.devi@chengalpattu.gov.in',
    'a1b2c3d4e5f60000000000000000000000000000000000000000000000000005',
    'BLOCK_OFFICER',
    'Chengalpattu', 'Madurantakam', 'Tamil Nadu', TRUE
),
(
    '11111111-0000-0000-0000-000000000006',
    'cognito-sub-block-002',
    'Suresh Kumar',
    'suresh.kumar@villupuram.gov.in',
    'a1b2c3d4e5f60000000000000000000000000000000000000000000000000006',
    'BLOCK_OFFICER',
    'Villupuram', 'Vikravandi', 'Tamil Nadu', TRUE
);


-- ============================================================
-- SEED DATA - beneficiaries (mock - 10 records per scheme)
-- ============================================================

INSERT INTO beneficiaries (phone_hash, name, scheme_id, pincode, block, district, state, ration_card_number, aadhaar_last4, gender, age, is_active, enrolled_date, language_pref) VALUES
-- PDS beneficiaries
('hash_pds_001', 'Lakshmi Murugan',      'PDS', '603001', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 'TN-CHES-00101', '1234', 'F', 45, TRUE, '2020-01-15', 'TA'),
('hash_pds_002', 'Selvam Arumugam',      'PDS', '603001', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 'TN-CHES-00102', '5678', 'M', 52, TRUE, '2020-01-15', 'TA'),
('hash_pds_003', 'Kamala Rajan',         'PDS', '603002', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 'TN-CHES-00103', '9012', 'F', 38, TRUE, '2020-03-10', 'TA'),
('hash_pds_004', 'Murugesan P',          'PDS', '603002', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 'TN-CHES-00104', '3456', 'M', 61, TRUE, '2019-11-01', 'TA'),
('hash_pds_005', 'Valli Sundaram',       'PDS', '605001', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 'TN-VPM-00201',  '7890', 'F', 34, TRUE, '2021-06-20', 'TA'),
('hash_pds_006', 'Panner Selvam',        'PDS', '605001', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 'TN-VPM-00202',  '2345', 'M', 49, TRUE, '2021-06-20', 'TA'),
('hash_pds_007', 'Radha Krishnamurthy',  'PDS', '605002', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 'TN-VPM-00203',  '6789', 'F', 55, TRUE, '2020-09-05', 'TA'),
('hash_pds_008', 'Govindasamy R',        'PDS', '605002', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 'TN-VPM-00204',  '0123', 'M', 42, TRUE, '2020-09-05', 'TA'),
('hash_pds_009', 'Chitra Balasubramanian','PDS','605003', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 'TN-VPM-00205',  '4567', 'F', 29, TRUE, '2022-02-14', 'TA'),
('hash_pds_010', 'Arjunan K',            'PDS', '605003', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 'TN-VPM-00206',  '8901', 'M', 67, FALSE,'2018-04-01', 'TA'),

-- PM_KISAN beneficiaries
('hash_pmk_001', 'Ramu Naicker',         'PM_KISAN', '603003', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '1111', 'M', 48, TRUE, '2020-07-01', 'TA'),
('hash_pmk_002', 'Saraswathi Pillai',    'PM_KISAN', '603003', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '2222', 'F', 53, TRUE, '2020-07-01', 'TA'),
('hash_pmk_003', 'Durai Pandian',        'PM_KISAN', '603004', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '3333', 'M', 60, TRUE, '2019-06-15', 'TA'),
('hash_pmk_004', 'Muthulakshmi G',       'PM_KISAN', '603004', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '4444', 'F', 41, TRUE, '2021-01-10', 'TA'),
('hash_pmk_005', 'Siva Subramanian',     'PM_KISAN', '605004', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '5555', 'M', 37, TRUE, '2021-01-10', 'TA'),
('hash_pmk_006', 'Parvathy Nadar',       'PM_KISAN', '605004', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '6666', 'F', 44, TRUE, '2020-12-01', 'TA'),
('hash_pmk_007', 'Venkataraman A',       'PM_KISAN', '605005', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '7777', 'M', 58, TRUE, '2020-12-01', 'TA'),
('hash_pmk_008', 'Sumathi Devi',         'PM_KISAN', '605005', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '8888', 'F', 50, TRUE, '2019-09-20', 'HI'),
('hash_pmk_009', 'Krishnaswamy M',       'PM_KISAN', '605006', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '9999', 'M', 63, TRUE, '2018-08-12', 'TA'),
('hash_pmk_010', 'Ponni Ammal',          'PM_KISAN', '605006', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '0000', 'F', 56, FALSE,'2018-08-12', 'TA'),

-- OLD_AGE_PENSION beneficiaries
('hash_oap_001', 'Thangamani Iyer',      'OLD_AGE_PENSION', '603005', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '1122', 'F', 72, TRUE, '2018-01-01', 'TA'),
('hash_oap_002', 'Raju Gounder',         'OLD_AGE_PENSION', '603005', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '3344', 'M', 78, TRUE, '2018-01-01', 'TA'),
('hash_oap_003', 'Kamatchi Amma',        'OLD_AGE_PENSION', '603006', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '5566', 'F', 82, TRUE, '2017-06-10', 'TA'),
('hash_oap_004', 'Palani Mudaliar',      'OLD_AGE_PENSION', '603006', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '7788', 'M', 69, TRUE, '2019-03-15', 'TA'),
('hash_oap_005', 'Vennila Ramamurthy',   'OLD_AGE_PENSION', '605007', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '9900', 'F', 74, TRUE, '2019-03-15', 'TA'),
('hash_oap_006', 'Sundaram Pillai',      'OLD_AGE_PENSION', '605007', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '1100', 'M', 85, TRUE, '2016-11-20', 'TA'),
('hash_oap_007', 'Meenakshi Ammal',      'OLD_AGE_PENSION', '605008', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '2211', 'F', 77, TRUE, '2016-11-20', 'TA'),
('hash_oap_008', 'Ramasamy Thevar',      'OLD_AGE_PENSION', '605008', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '3322', 'M', 70, TRUE, '2020-05-01', 'TA'),
('hash_oap_009', 'Sakunthala G',         'OLD_AGE_PENSION', '605009', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '4433', 'F', 91, TRUE, '2015-07-04', 'TA'),
('hash_oap_010', 'Mani Iyer',            'OLD_AGE_PENSION', '605009', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '5544', 'M', 68, FALSE,'2015-07-04', 'TA'),

-- LPG beneficiaries
('hash_lpg_001', 'Nirmala Sundaresan',   'LPG', '603007', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '6655', 'F', 33, TRUE, '2021-04-01', 'TA'),
('hash_lpg_002', 'Babu Rajendran',       'LPG', '603007', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '7766', 'M', 40, TRUE, '2021-04-01', 'TA'),
('hash_lpg_003', 'Kalpana Mohan',        'LPG', '603008', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '8877', 'F', 28, TRUE, '2022-01-15', 'TA'),
('hash_lpg_004', 'Thilagan K',           'LPG', '603008', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', NULL, '9988', 'M', 36, TRUE, '2022-01-15', 'TA'),
('hash_lpg_005', 'Rani Devi',            'LPG', '605010', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '0099', 'F', 31, TRUE, '2021-09-10', 'TA'),
('hash_lpg_006', 'Manikandan T',         'LPG', '605010', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '1098', 'M', 45, TRUE, '2021-09-10', 'TA'),
('hash_lpg_007', 'Geetha Suresh',        'LPG', '605011', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '2109', 'F', 38, TRUE, '2020-11-30', 'TA'),
('hash_lpg_008', 'Arumugam V',           'LPG', '605011', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '3210', 'M', 52, TRUE, '2020-11-30', 'TA'),
('hash_lpg_009', 'Preethi Nair',         'LPG', '605012', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '4321', 'F', 27, TRUE, '2023-02-28', 'TA'),
('hash_lpg_010', 'Sathishkumar R',       'LPG', '605012', 'Vikravandi',   'Villupuram',   'Tamil Nadu', NULL, '5432', 'M', 43, FALSE,'2019-07-07', 'TA');


-- ============================================================
-- SEED DATA - anomaly_records (mock - 3 records)
-- ============================================================

INSERT INTO anomaly_records (
    id, date, detector_type, level, pincode, block, district, state, scheme_id,
    severity, score, no_pct, baseline_no_pct, total_responses, affected_beneficiaries,
    raw_data, ai_classification, ai_confidence, ai_reasoning, ai_action, ai_action_ta,
    ai_urgency, status, assigned_officer_id, created_at
) VALUES
(
    'aaaaaaaa-0000-0000-0000-000000000001',
    '2024-11-19',
    'NO_SPIKE',
    'PINCODE',
    '605001', 'Vikravandi', 'Villupuram', 'Tamil Nadu', 'PDS',
    'CRITICAL', 4.2, 0.78, 0.31, 142, 210,
    '{"z_score": 4.2, "today_no_pct": 0.78, "baseline_no_pct": 0.31, "std_dev": 0.112, "window": "2024-11-19#14"}'::JSONB,
    'SUPPLY_FAILURE', 0.91,
    'NO% spiked to 78% vs 7-day baseline of 31% - z-score 4.2 indicates a non-random event. Pattern consistent with distribution point not opening.',
    'Conduct immediate field visit to FPS store at 605001. Verify stock availability and dealer attendance.',
    '605001 இல் உள்ள FPS கடைக்கு உடனடி கள வருகை மேற்கொள்ளவும். பங்கு கிடைக்கும் தன்மையை சரிபார்க்கவும்.',
    'TODAY',
    'ASSIGNED',
    '11111111-0000-0000-0000-000000000006',
    '2024-11-19 14:30:00+05:30'
),
(
    'aaaaaaaa-0000-0000-0000-000000000002',
    '2024-11-19',
    'SILENCE',
    'PINCODE',
    '603002', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 'OLD_AGE_PENSION',
    'HIGH', 0.73, NULL, NULL, 4, 87,
    '{"expected_responses": 26, "actual_responses": 4, "silence_ratio": 0.846, "threshold": 0.60}'::JSONB,
    'DATA_ARTIFACT', 0.62,
    'Only 4 responses from expected 26 beneficiaries. Could indicate network outage or IVR routing issue rather than actual non-delivery.',
    'Verify IVR call logs for this PIN code. Cross-check with telecom provider for network issues on 2024-11-19.',
    '603002 க்கான IVR அழைப்பு பதிவுகளை சரிபார்க்கவும். நெட்வொர்க் சிக்கல்களுக்கு தொலைத்தொடர்பு வழங்குநரிடம் தொடர்பு கொள்ளவும்.',
    'THIS_WEEK',
    'INVESTIGATING',
    '11111111-0000-0000-0000-000000000005',
    '2024-11-19 16:00:00+05:30'
),
(
    'aaaaaaaa-0000-0000-0000-000000000003',
    '2024-11-18',
    'DISTRICT_ROLLUP',
    'DISTRICT',
    NULL, NULL, 'Villupuram', 'Tamil Nadu', 'PM_KISAN',
    'HIGH', 0.41, 0.41, 0.22, 1840, 3200,
    '{"flagged_blocks": ["Vikravandi", "Ulundurpet", "Kallakurichi"], "district_no_pct": 0.41, "threshold": 0.40, "min_flagged_blocks": 3}'::JSONB,
    'SUPPLY_FAILURE', 0.77,
    'Three blocks exceeded NO% threshold simultaneously - suggests a district-level disbursement delay rather than isolated incidents.',
    'Escalate to District Collector. Review PM Kisan instalment release status from PFMS portal for Villupuram.',
    'மாவட்ட ஆட்சியரிடம் தெரிவிக்கவும். வில்லுபுரத்திற்கான PFMS போர்ட்டலில் PM கிசான் தவணை வெளியீட்டு நிலையை சரிபார்க்கவும்.',
    'TODAY',
    'ESCALATED',
    '11111111-0000-0000-0000-000000000004',
    '2024-11-18 22:00:00+05:30'
);


-- ============================================================
-- SEED DATA - alert_actions (mock)
-- ============================================================

INSERT INTO alert_actions (anomaly_record_id, officer_id, action_type, notes, created_at) VALUES
(
    'aaaaaaaa-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000006',
    'ASSIGNED',
    'Auto-assigned by system based on block jurisdiction.',
    '2024-11-19 14:31:00+05:30'
),
(
    'aaaaaaaa-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000006',
    'FIELD_VISIT_STARTED',
    'Departing to FPS store at Vikravandi main market.',
    '2024-11-19 15:45:00+05:30'
),
(
    'aaaaaaaa-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000004',
    'ESCALATED',
    'Three blocks affected. Escalating to District Collector for PFMS review.',
    '2024-11-18 22:15:00+05:30'
);


-- ============================================================
-- SEED DATA - daily_reports (mock - JSONB included)
-- ============================================================

INSERT INTO daily_reports (
    district, report_date, narrative_text, total_responses, total_anomalies,
    critical_count, high_count, medium_count, schemes_summary,
    best_performing_block, worst_performing_pincode, email_sent, email_sent_at, generated_at
) VALUES
(
    'Villupuram',
    '2024-11-19',
    'Villupuram district recorded 4,320 total responses across all four welfare schemes on 19 November 2024, representing a 72% response rate against 6,000 active beneficiaries. One CRITICAL anomaly was detected in pincode 605001 under PDS - NO% reached 78% against a 31% baseline, indicating a probable FPS distribution failure. A district-wide HIGH alert was also raised for PM Kisan, with three blocks (Vikravandi, Ulundurpet, Kallakurichi) simultaneously exceeding the 40% NO threshold. Immediate field verification is underway. Old Age Pension and LPG schemes performed within expected parameters today.',
    4320, 2, 1, 1, 0,
    '{"PDS": {"responses": 1420, "no_pct": 0.38, "anomalies": 1}, "PM_KISAN": {"responses": 1100, "no_pct": 0.41, "anomalies": 1}, "OLD_AGE_PENSION": {"responses": 980, "no_pct": 0.21, "anomalies": 0}, "LPG": {"responses": 820, "no_pct": 0.18, "anomalies": 0}}'::JSONB,
    'Gingee',
    '605001',
    TRUE,
    '2024-11-19 23:00:00+05:30',
    '2024-11-19 22:45:00+05:30'
);


-- ============================================================
-- END OF SCHEMA
-- ============================================================
