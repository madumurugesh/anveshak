-- ============================================================
-- WelfareWatch — Mock Data Population Script
-- Run AFTER welfarewatch_schema.sql (which already seeds:
--   scheme_config, officers, beneficiaries, anomaly_records,
--   alert_actions, daily_reports)
--
-- This script populates the REMAINING tables with realistic
-- mock data for development and testing.
-- ============================================================


-- ============================================================
-- ivr_sessions — 20 mock IVR call sessions
-- ============================================================

INSERT INTO ivr_sessions (call_sid, phone_hash, scheme_id, step, step1_digit, step1_ts, language, ttl, created_at) VALUES
-- Completed PDS calls
('CA0001-twilio-sid-abc', 'hash_pds_001', 'PDS', 'COMPLETED', '1', '2024-11-19 10:01:00+05:30', 'TA', 1732000860, '2024-11-19 10:00:30+05:30'),
('CA0002-twilio-sid-def', 'hash_pds_002', 'PDS', 'COMPLETED', '1', '2024-11-19 10:03:00+05:30', 'TA', 1732000980, '2024-11-19 10:02:30+05:30'),
('CA0003-twilio-sid-ghi', 'hash_pds_003', 'PDS', 'COMPLETED', '1', '2024-11-19 10:05:15+05:30', 'TA', 1732001115, '2024-11-19 10:04:45+05:30'),
('CA0004-twilio-sid-jkl', 'hash_pds_005', 'PDS', 'COMPLETED', '1', '2024-11-19 10:10:00+05:30', 'TA', 1732001400, '2024-11-19 10:09:30+05:30'),
('CA0005-twilio-sid-mno', 'hash_pds_006', 'PDS', 'COMPLETED', '1', '2024-11-19 10:12:00+05:30', 'TA', 1732001520, '2024-11-19 10:11:30+05:30'),

-- Completed PM_KISAN calls
('CA0006-twilio-sid-pqr', 'hash_pmk_001', 'PM_KISAN', 'COMPLETED', '2', '2024-11-19 11:01:00+05:30', 'TA', 1732004460, '2024-11-19 11:00:30+05:30'),
('CA0007-twilio-sid-stu', 'hash_pmk_002', 'PM_KISAN', 'COMPLETED', '2', '2024-11-19 11:04:00+05:30', 'TA', 1732004640, '2024-11-19 11:03:30+05:30'),
('CA0008-twilio-sid-vwx', 'hash_pmk_005', 'PM_KISAN', 'COMPLETED', '2', '2024-11-19 11:10:00+05:30', 'TA', 1732005000, '2024-11-19 11:09:30+05:30'),
('CA0009-twilio-sid-yza', 'hash_pmk_008', 'PM_KISAN', 'COMPLETED', '2', '2024-11-19 11:15:00+05:30', 'HI', 1732005300, '2024-11-19 11:14:30+05:30'),

-- Completed OLD_AGE_PENSION calls
('CA0010-twilio-sid-bcd', 'hash_oap_001', 'OLD_AGE_PENSION', 'COMPLETED', '3', '2024-11-19 12:01:00+05:30', 'TA', 1732008060, '2024-11-19 12:00:30+05:30'),
('CA0011-twilio-sid-efg', 'hash_oap_003', 'OLD_AGE_PENSION', 'COMPLETED', '3', '2024-11-19 12:05:00+05:30', 'TA', 1732008300, '2024-11-19 12:04:30+05:30'),
('CA0012-twilio-sid-hij', 'hash_oap_005', 'OLD_AGE_PENSION', 'COMPLETED', '3', '2024-11-19 12:08:00+05:30', 'TA', 1732008480, '2024-11-19 12:07:30+05:30'),

-- Completed LPG calls
('CA0013-twilio-sid-klm', 'hash_lpg_001', 'LPG', 'COMPLETED', '4', '2024-11-19 14:01:00+05:30', 'TA', 1732015260, '2024-11-19 14:00:30+05:30'),
('CA0014-twilio-sid-nop', 'hash_lpg_003', 'LPG', 'COMPLETED', '4', '2024-11-19 14:05:00+05:30', 'TA', 1732015500, '2024-11-19 14:04:30+05:30'),
('CA0015-twilio-sid-qrs', 'hash_lpg_005', 'LPG', 'COMPLETED', '4', '2024-11-19 14:10:00+05:30', 'TA', 1732015800, '2024-11-19 14:09:30+05:30'),

-- Timed out / invalid sessions
('CA0016-twilio-sid-tuv', 'hash_pds_007', NULL, 'TIMED_OUT', NULL, NULL, 'TA', 1732016100, '2024-11-19 14:14:30+05:30'),
('CA0017-twilio-sid-wxy', 'hash_pmk_003', 'PM_KISAN', 'TIMED_OUT', '2', '2024-11-19 14:20:00+05:30', 'TA', 1732016400, '2024-11-19 14:19:30+05:30'),
('CA0018-twilio-sid-zab', 'hash_oap_007', NULL, 'INVALID', '9', '2024-11-19 14:25:00+05:30', 'TA', 1732016700, '2024-11-19 14:24:30+05:30'),

-- Scheme selected but not completed
('CA0019-twilio-sid-cde', 'hash_lpg_007', 'LPG', 'SCHEME_SELECTED', '4', '2024-11-19 15:01:00+05:30', 'TA', 1732019760, '2024-11-19 15:00:30+05:30'),
('CA0020-twilio-sid-fgh', 'hash_pds_009', 'PDS', 'SCHEME_SELECTED', '1', '2024-11-19 15:05:00+05:30', 'TA', 1732020000, '2024-11-19 15:04:30+05:30');


-- ============================================================
-- responses_dynamo_ref — Windowed response counters (3 days × 4 schemes × 2 pincodes)
-- ============================================================

INSERT INTO responses_dynamo_ref (pk, sk, yes_count, no_count, total, district, block, state, last_updated) VALUES
-- 2024-11-17 — PDS
('603001#PDS', '2024-11-17#10', 12, 4, 16, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-17 10:59:00+05:30'),
('603001#PDS', '2024-11-17#14', 18, 6, 24, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-17 14:59:00+05:30'),
('605001#PDS', '2024-11-17#10', 15, 5, 20, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-17 10:59:00+05:30'),
('605001#PDS', '2024-11-17#14', 20, 8, 28, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-17 14:59:00+05:30'),

-- 2024-11-18 — PDS
('603001#PDS', '2024-11-18#10', 14, 5, 19, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-18 10:59:00+05:30'),
('603001#PDS', '2024-11-18#14', 16, 7, 23, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-18 14:59:00+05:30'),
('605001#PDS', '2024-11-18#10', 13, 6, 19, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-18 10:59:00+05:30'),
('605001#PDS', '2024-11-18#14', 17, 9, 26, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-18 14:59:00+05:30'),

-- 2024-11-19 — PDS (anomaly day — 605001 has high NO)
('603001#PDS', '2024-11-19#10', 15, 5, 20, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-19 10:59:00+05:30'),
('603001#PDS', '2024-11-19#14', 19, 6, 25, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-19 14:59:00+05:30'),
('605001#PDS', '2024-11-19#10', 8, 32, 40, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-19 10:59:00+05:30'),
('605001#PDS', '2024-11-19#14', 23, 79, 102, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-19 14:59:00+05:30'),

-- 2024-11-19 — PM_KISAN
('603003#PM_KISAN', '2024-11-19#10', 10, 8, 18, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-19 10:59:00+05:30'),
('603003#PM_KISAN', '2024-11-19#14', 14, 12, 26, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-19 14:59:00+05:30'),
('605004#PM_KISAN', '2024-11-19#10', 6, 14, 20, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-19 10:59:00+05:30'),
('605004#PM_KISAN', '2024-11-19#14', 10, 22, 32, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-19 14:59:00+05:30'),

-- 2024-11-19 — OLD_AGE_PENSION
('603005#OLD_AGE_PENSION', '2024-11-19#10', 6, 2, 8, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-19 10:59:00+05:30'),
('605007#OLD_AGE_PENSION', '2024-11-19#10', 5, 1, 6, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-19 10:59:00+05:30'),

-- 2024-11-19 — LPG
('603007#LPG', '2024-11-19#10', 8, 2, 10, 'Chengalpattu', 'Madurantakam', 'Tamil Nadu', '2024-11-19 10:59:00+05:30'),
('605010#LPG', '2024-11-19#10', 7, 1, 8, 'Villupuram', 'Vikravandi', 'Tamil Nadu', '2024-11-19 10:59:00+05:30');


-- ============================================================
-- response_dedup — 30 dedup records (one response per beneficiary per day)
-- ============================================================

INSERT INTO response_dedup (pk, response, channel, call_sid, timestamp, ttl) VALUES
-- PDS responses on 2024-11-19
('hash_pds_001#PDS#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0001-twilio-sid-abc', '2024-11-19 10:01:30+05:30', 1732089600),
('hash_pds_002#PDS#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0002-twilio-sid-def', '2024-11-19 10:03:30+05:30', 1732089600),
('hash_pds_003#PDS#2024-11-19', 'NO',  'IVR_MISSEDCALL', 'CA0003-twilio-sid-ghi', '2024-11-19 10:05:45+05:30', 1732089600),
('hash_pds_004#PDS#2024-11-19', 'NO',  'SMS',            NULL,                     '2024-11-19 10:20:00+05:30', 1732089600),
('hash_pds_005#PDS#2024-11-19', 'NO',  'IVR_MISSEDCALL', 'CA0004-twilio-sid-jkl', '2024-11-19 10:10:30+05:30', 1732089600),
('hash_pds_006#PDS#2024-11-19', 'NO',  'IVR_MISSEDCALL', 'CA0005-twilio-sid-mno', '2024-11-19 10:12:30+05:30', 1732089600),
('hash_pds_007#PDS#2024-11-19', 'NO',  'SMS',            NULL,                     '2024-11-19 11:00:00+05:30', 1732089600),
('hash_pds_008#PDS#2024-11-19', 'NO',  'IVR_OUTBOUND',   NULL,                     '2024-11-19 11:15:00+05:30', 1732089600),
('hash_pds_009#PDS#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0020-twilio-sid-fgh', '2024-11-19 15:05:30+05:30', 1732089600),

-- PM_KISAN responses on 2024-11-19
('hash_pmk_001#PM_KISAN#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0006-twilio-sid-pqr', '2024-11-19 11:01:30+05:30', 1732089600),
('hash_pmk_002#PM_KISAN#2024-11-19', 'NO',  'IVR_MISSEDCALL', 'CA0007-twilio-sid-stu', '2024-11-19 11:04:30+05:30', 1732089600),
('hash_pmk_003#PM_KISAN#2024-11-19', 'NO',  'SMS',            NULL,                     '2024-11-19 12:00:00+05:30', 1732089600),
('hash_pmk_004#PM_KISAN#2024-11-19', 'NO',  'IVR_OUTBOUND',   NULL,                     '2024-11-19 12:30:00+05:30', 1732089600),
('hash_pmk_005#PM_KISAN#2024-11-19', 'NO',  'IVR_MISSEDCALL', 'CA0008-twilio-sid-vwx', '2024-11-19 11:10:30+05:30', 1732089600),
('hash_pmk_006#PM_KISAN#2024-11-19', 'NO',  'SMS',            NULL,                     '2024-11-19 13:00:00+05:30', 1732089600),
('hash_pmk_007#PM_KISAN#2024-11-19', 'YES', 'IVR_OUTBOUND',   NULL,                     '2024-11-19 13:30:00+05:30', 1732089600),
('hash_pmk_008#PM_KISAN#2024-11-19', 'NO',  'IVR_MISSEDCALL', 'CA0009-twilio-sid-yza', '2024-11-19 11:15:30+05:30', 1732089600),
('hash_pmk_009#PM_KISAN#2024-11-19', 'NO',  'SMS',            NULL,                     '2024-11-19 14:00:00+05:30', 1732089600),

-- OLD_AGE_PENSION responses on 2024-11-19
('hash_oap_001#OLD_AGE_PENSION#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0010-twilio-sid-bcd', '2024-11-19 12:01:30+05:30', 1732089600),
('hash_oap_002#OLD_AGE_PENSION#2024-11-19', 'YES', 'SMS',            NULL,                     '2024-11-19 12:20:00+05:30', 1732089600),
('hash_oap_003#OLD_AGE_PENSION#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0011-twilio-sid-efg', '2024-11-19 12:05:30+05:30', 1732089600),
('hash_oap_005#OLD_AGE_PENSION#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0012-twilio-sid-hij', '2024-11-19 12:08:30+05:30', 1732089600),
('hash_oap_006#OLD_AGE_PENSION#2024-11-19', 'NO',  'SMS',            NULL,                     '2024-11-19 13:00:00+05:30', 1732089600),
('hash_oap_007#OLD_AGE_PENSION#2024-11-19', 'YES', 'IVR_OUTBOUND',   NULL,                     '2024-11-19 13:30:00+05:30', 1732089600),

-- LPG responses on 2024-11-19
('hash_lpg_001#LPG#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0013-twilio-sid-klm', '2024-11-19 14:01:30+05:30', 1732089600),
('hash_lpg_002#LPG#2024-11-19', 'YES', 'SMS',            NULL,                     '2024-11-19 14:15:00+05:30', 1732089600),
('hash_lpg_003#LPG#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0014-twilio-sid-nop', '2024-11-19 14:05:30+05:30', 1732089600),
('hash_lpg_005#LPG#2024-11-19', 'YES', 'IVR_MISSEDCALL', 'CA0015-twilio-sid-qrs', '2024-11-19 14:10:30+05:30', 1732089600),
('hash_lpg_006#LPG#2024-11-19', 'NO',  'IVR_OUTBOUND',   NULL,                     '2024-11-19 15:00:00+05:30', 1732089600),
('hash_lpg_007#LPG#2024-11-19', 'YES', 'SMS',            NULL,                     '2024-11-19 15:30:00+05:30', 1732089600);


-- ============================================================
-- baselines_cache — 7-day rolling baselines for key pincodes
-- ============================================================

INSERT INTO baselines_cache (pk, sk, no_pct, yes_pct, total, ttl) VALUES
-- 603001#PDS — 7-day window
('603001#PDS', '2024-11-13', 0.2500, 0.7500, 32, 1732089600),
('603001#PDS', '2024-11-14', 0.2800, 0.7200, 29, 1732089600),
('603001#PDS', '2024-11-15', 0.2200, 0.7800, 36, 1732089600),
('603001#PDS', '2024-11-16', 0.2600, 0.7400, 31, 1732089600),
('603001#PDS', '2024-11-17', 0.2500, 0.7500, 40, 1732089600),
('603001#PDS', '2024-11-18', 0.2857, 0.7143, 42, 1732089600),
('603001#PDS', '2024-11-19', 0.2444, 0.7556, 45, 1732089600),

-- 605001#PDS — 7-day window (anomaly on 11-19)
('605001#PDS', '2024-11-13', 0.2800, 0.7200, 25, 1732089600),
('605001#PDS', '2024-11-14', 0.3200, 0.6800, 28, 1732089600),
('605001#PDS', '2024-11-15', 0.3000, 0.7000, 30, 1732089600),
('605001#PDS', '2024-11-16', 0.2900, 0.7100, 27, 1732089600),
('605001#PDS', '2024-11-17', 0.2700, 0.7300, 48, 1732089600),
('605001#PDS', '2024-11-18', 0.3333, 0.6667, 45, 1732089600),
('605001#PDS', '2024-11-19', 0.7800, 0.2200, 142, 1732089600),  -- ANOMALY DAY

-- 605004#PM_KISAN — 7-day window
('605004#PM_KISAN', '2024-11-13', 0.2000, 0.8000, 15, 1732089600),
('605004#PM_KISAN', '2024-11-14', 0.1800, 0.8200, 18, 1732089600),
('605004#PM_KISAN', '2024-11-15', 0.2200, 0.7800, 20, 1732089600),
('605004#PM_KISAN', '2024-11-16', 0.2100, 0.7900, 16, 1732089600),
('605004#PM_KISAN', '2024-11-17', 0.1900, 0.8100, 22, 1732089600),
('605004#PM_KISAN', '2024-11-18', 0.2300, 0.7700, 19, 1732089600),
('605004#PM_KISAN', '2024-11-19', 0.4100, 0.5900, 52, 1732089600),  -- elevated

-- 603005#OLD_AGE_PENSION — 7-day window
('603005#OLD_AGE_PENSION', '2024-11-13', 0.1500, 0.8500, 8, 1732089600),
('603005#OLD_AGE_PENSION', '2024-11-14', 0.1200, 0.8800, 10, 1732089600),
('603005#OLD_AGE_PENSION', '2024-11-15', 0.1800, 0.8200, 9, 1732089600),
('603005#OLD_AGE_PENSION', '2024-11-16', 0.1400, 0.8600, 7, 1732089600),
('603005#OLD_AGE_PENSION', '2024-11-17', 0.1600, 0.8400, 11, 1732089600),
('603005#OLD_AGE_PENSION', '2024-11-18', 0.2000, 0.8000, 8, 1732089600),
('603005#OLD_AGE_PENSION', '2024-11-19', 0.2500, 0.7500, 8, 1732089600);


-- ============================================================
-- rejected_responses — 12 mock rejected calls/responses
-- ============================================================

INSERT INTO rejected_responses (call_sid, phone_hash, scheme_id, rejection_reason, raw_digit, rejected_at) VALUES
-- Unregistered callers
('CA9001-twilio-sid-unk1', 'hash_unknown_001', 'PDS',             'UNREGISTERED',       '1', '2024-11-19 09:30:00+05:30'),
('CA9002-twilio-sid-unk2', 'hash_unknown_002', 'PM_KISAN',        'UNREGISTERED',       '2', '2024-11-19 10:15:00+05:30'),
('CA9003-twilio-sid-unk3', 'hash_unknown_003', 'LPG',             'UNREGISTERED',       '4', '2024-11-19 11:00:00+05:30'),

-- Duplicate responses (same person called twice in one day)
('CA9004-twilio-sid-dup1', 'hash_pds_001', 'PDS',                 'DUPLICATE',          '1', '2024-11-19 15:00:00+05:30'),
('CA9005-twilio-sid-dup2', 'hash_pmk_005', 'PM_KISAN',            'DUPLICATE',          '2', '2024-11-19 16:00:00+05:30'),
('CA9006-twilio-sid-dup3', 'hash_oap_001', 'OLD_AGE_PENSION',     'DUPLICATE',          '3', '2024-11-19 16:30:00+05:30'),

-- Invalid input (pressed wrong digit for confirmation)
('CA9007-twilio-sid-inv1', 'hash_pds_004', 'PDS',                 'INVALID_INPUT',      '5', '2024-11-19 10:30:00+05:30'),
('CA9008-twilio-sid-inv2', 'hash_lpg_002', 'LPG',                 'INVALID_INPUT',      '9', '2024-11-19 14:20:00+05:30'),
('CA9009-twilio-sid-inv3', 'hash_pmk_007', 'PM_KISAN',            'INVALID_INPUT',      '0', '2024-11-19 13:45:00+05:30'),

-- Inactive beneficiaries who tried to respond
('CA9010-twilio-sid-ina1', 'hash_pds_010', 'PDS',                 'INACTIVE_BENEFICIARY','1', '2024-11-19 11:30:00+05:30'),
('CA9011-twilio-sid-ina2', 'hash_pmk_010', 'PM_KISAN',            'INACTIVE_BENEFICIARY','2', '2024-11-19 12:00:00+05:30'),
('CA9012-twilio-sid-ina3', 'hash_oap_010', 'OLD_AGE_PENSION',     'INACTIVE_BENEFICIARY','3', '2024-11-19 12:15:00+05:30');


-- ============================================================
-- daily_responses — Aggregated daily data (3 days × multiple pincodes)
-- ============================================================

INSERT INTO daily_responses (date, pincode, scheme_id, block, district, state, yes_count, no_count, total_responses, no_pct, active_beneficiaries, response_rate) VALUES
-- 2024-11-17 — Normal day
('2024-11-17', '603001', 'PDS', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 30, 10, 40, 0.2500, 150, 0.2667),
('2024-11-17', '603002', 'PDS', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 28, 8,  36, 0.2222, 140, 0.2571),
('2024-11-17', '605001', 'PDS', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 35, 13, 48, 0.2708, 210, 0.2286),
('2024-11-17', '605002', 'PDS', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 32, 10, 42, 0.2381, 180, 0.2333),

-- 2024-11-18 — Normal day
('2024-11-18', '603001', 'PDS', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 30, 12, 42, 0.2857, 150, 0.2800),
('2024-11-18', '603002', 'PDS', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 25, 10, 35, 0.2857, 140, 0.2500),
('2024-11-18', '605001', 'PDS', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 30, 15, 45, 0.3333, 210, 0.2143),
('2024-11-18', '605002', 'PDS', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 28, 12, 40, 0.3000, 180, 0.2222),

-- 2024-11-19 — ANOMALY day (605001 PDS spikes)
('2024-11-19', '603001', 'PDS', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 34, 11, 45, 0.2444, 150, 0.3000),
('2024-11-19', '603002', 'PDS', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 26, 9,  35, 0.2571, 140, 0.2500),
('2024-11-19', '605001', 'PDS', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 31, 111,142, 0.7817, 210, 0.6762),
('2024-11-19', '605002', 'PDS', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 30, 14, 44, 0.3182, 180, 0.2444),

-- 2024-11-19 — PM_KISAN (district-wide elevated NO)
('2024-11-19', '603003', 'PM_KISAN', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 24, 20, 44, 0.4545, 120, 0.3667),
('2024-11-19', '605004', 'PM_KISAN', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 16, 36, 52, 0.6923, 100, 0.5200),
('2024-11-19', '605005', 'PM_KISAN', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 18, 30, 48, 0.6250, 110, 0.4364),
('2024-11-19', '605006', 'PM_KISAN', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 12, 22, 34, 0.6471, 90,  0.3778),

-- 2024-11-19 — OLD_AGE_PENSION (silence in 603002)
('2024-11-19', '603005', 'OLD_AGE_PENSION', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 6, 2, 8, 0.2500, 30, 0.2667),
('2024-11-19', '603006', 'OLD_AGE_PENSION', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 3, 1, 4, 0.2500, 87, 0.0460),
('2024-11-19', '605007', 'OLD_AGE_PENSION', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 5, 1, 6, 0.1667, 40, 0.1500),

-- 2024-11-19 — LPG (normal)
('2024-11-19', '603007', 'LPG', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 8, 2, 10, 0.2000, 50, 0.2000),
('2024-11-19', '605010', 'LPG', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 7, 1,  8, 0.1250, 45, 0.1778),
('2024-11-19', '605011', 'LPG', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 6, 2,  8, 0.2500, 40, 0.2000);


-- ============================================================
-- district_baselines — Weekly computed baselines
-- ============================================================

INSERT INTO district_baselines (district, block, scheme_id, computed_date, avg_no_pct, std_dev_no_pct, avg_total_responses, avg_response_rate, sample_days) VALUES
-- Chengalpattu baselines (computed Sunday 2024-11-17)
('Chengalpattu', 'Madurantakam', 'PDS',             '2024-11-17', 0.2600, 0.0350, 38.00, 0.2600, 7),
('Chengalpattu', 'Madurantakam', 'PM_KISAN',        '2024-11-17', 0.2200, 0.0280, 22.00, 0.2200, 7),
('Chengalpattu', 'Madurantakam', 'OLD_AGE_PENSION', '2024-11-17', 0.1600, 0.0250, 9.00,  0.1800, 7),
('Chengalpattu', 'Madurantakam', 'LPG',             '2024-11-17', 0.1800, 0.0300, 10.00, 0.2000, 7),

-- Villupuram baselines (computed Sunday 2024-11-17)
('Villupuram', 'Vikravandi', 'PDS',             '2024-11-17', 0.3100, 0.1120, 44.00, 0.2400, 7),
('Villupuram', 'Vikravandi', 'PM_KISAN',        '2024-11-17', 0.2100, 0.0400, 18.00, 0.2000, 7),
('Villupuram', 'Vikravandi', 'OLD_AGE_PENSION', '2024-11-17', 0.1500, 0.0200, 7.00,  0.1600, 7),
('Villupuram', 'Vikravandi', 'LPG',             '2024-11-17', 0.1700, 0.0280, 8.00,  0.1800, 7),

-- District-level aggregates
('Chengalpattu', NULL, 'PDS',      '2024-11-17', 0.2500, 0.0320, 76.00, 0.2600, 7),
('Chengalpattu', NULL, 'PM_KISAN', '2024-11-17', 0.2100, 0.0260, 44.00, 0.2200, 7),
('Villupuram',   NULL, 'PDS',      '2024-11-17', 0.3000, 0.1000, 90.00, 0.2300, 7),
('Villupuram',   NULL, 'PM_KISAN', '2024-11-17', 0.2200, 0.0420, 52.00, 0.2100, 7);


-- ============================================================
-- ai_prompt_log — 3 logs matching the 3 seed anomaly_records
-- ============================================================

INSERT INTO ai_prompt_log (
    anomaly_record_id, lambda_name, model,
    prompt_tokens, completion_tokens, total_tokens, cost_usd,
    prompt_text, response_text, success, error_message, latency_ms, called_at
) VALUES
(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'ai-anomaly-engine', 'gpt-4o-mini',
    820, 195, 1015, 0.000240,
    '{"id":"aaaaaaaa-0000-0000-0000-000000000001","date":"2024-11-19","detector_type":"NO_SPIKE","level":"PINCODE","pincode":"605001","block":"Vikravandi","district":"Villupuram","state":"Tamil Nadu","scheme_id":"PDS","severity":"CRITICAL","score":4.2,"no_pct":0.78,"baseline_no_pct":0.31,"total_responses":142,"affected_beneficiaries":210}',
    '{"ai_classification":"SUPPLY_FAILURE","ai_confidence":0.91,"ai_reasoning":"NO% spiked to 78% vs 7-day baseline of 31% — z-score 4.2 indicates a non-random event. Pattern consistent with distribution point not opening.","ai_action":"Conduct immediate field visit to FPS store at 605001. Verify stock availability and dealer attendance.","ai_action_ta":"605001 இல் உள்ள FPS கடைக்கு உடனடி கள வருகை மேற்கொள்ளவும். பங்கு கிடைக்கும் தன்மையை சரிபார்க்கவும்.","ai_urgency":"TODAY","signals_used":["z_score_4.2","no_pct_0.78","distribution_window_active"],"confidence_adjustments":[{"factor":"high_sample_size","delta":0.05},{"factor":"score_exceeds_2x_threshold","delta":0.05}]}',
    TRUE, NULL, 1842,
    '2024-11-19 14:29:50+05:30'
),
(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'ai-anomaly-engine', 'gpt-4o-mini',
    790, 180, 970, 0.000227,
    '{"id":"aaaaaaaa-0000-0000-0000-000000000002","date":"2024-11-19","detector_type":"SILENCE","level":"PINCODE","pincode":"603002","block":"Madurantakam","district":"Chengalpattu","state":"Tamil Nadu","scheme_id":"OLD_AGE_PENSION","severity":"HIGH","score":0.73,"no_pct":null,"baseline_no_pct":null,"total_responses":4,"affected_beneficiaries":87}',
    '{"ai_classification":"DATA_ARTIFACT","ai_confidence":0.62,"ai_reasoning":"Only 4 responses from expected 26 beneficiaries. Could indicate network outage or IVR routing issue rather than actual non-delivery.","ai_action":"Verify IVR call logs for this PIN code. Cross-check with telecom provider for network issues on 2024-11-19.","ai_action_ta":"603002 க்கான IVR அழைப்பு பதிவுகளை சரிபார்க்கவும். நெட்வொர்க் சிக்கல்களுக்கு தொலைத்தொடர்பு வழங்குநரிடம் தொடர்பு கொள்ளவும்.","ai_urgency":"THIS_WEEK","signals_used":["silence_ratio_0.846","low_total_responses"],"confidence_adjustments":[{"factor":"total_responses_lt_10","delta":-0.10},{"factor":"first_occurrence","delta":-0.10}]}',
    TRUE, NULL, 2105,
    '2024-11-19 15:59:50+05:30'
),
(
    'aaaaaaaa-0000-0000-0000-000000000003',
    'ai-anomaly-engine', 'gpt-4o-mini',
    850, 190, 1040, 0.000242,
    '{"id":"aaaaaaaa-0000-0000-0000-000000000003","date":"2024-11-18","detector_type":"DISTRICT_ROLLUP","level":"DISTRICT","pincode":null,"block":null,"district":"Villupuram","state":"Tamil Nadu","scheme_id":"PM_KISAN","severity":"HIGH","score":0.41,"no_pct":0.41,"baseline_no_pct":0.22,"total_responses":1840,"affected_beneficiaries":3200}',
    '{"ai_classification":"SUPPLY_FAILURE","ai_confidence":0.77,"ai_reasoning":"Three blocks exceeded NO% threshold simultaneously — suggests a district-level disbursement delay rather than isolated incidents.","ai_action":"Escalate to District Collector. Review PM Kisan instalment release status from PFMS portal for Villupuram.","ai_action_ta":"மாவட்ட ஆட்சியரிடம் தெரிவிக்கவும். வில்லுபுரத்திற்கான PFMS போர்ட்டலில் PM கிசான் தவணை வெளியீட்டு நிலையை சரிபார்க்கவும்.","ai_urgency":"TODAY","signals_used":["district_rollup_3_blocks","no_pct_0.41","baseline_deviation"],"confidence_adjustments":[{"factor":"multiple_blocks_corroborate","delta":0.05}]}',
    TRUE, NULL, 1650,
    '2024-11-18 21:59:50+05:30'
);


-- ============================================================
-- notification_log — Notifications sent for anomalies & reports
-- ============================================================

INSERT INTO notification_log (
    anomaly_record_id, report_id, channel, recipient_officer_id,
    recipient_address, message_type, sns_message_id, ses_message_id,
    delivered, sent_at
) VALUES
-- CRITICAL alert → SMS + Email to block officer (anomaly 1)
(
    'aaaaaaaa-0000-0000-0000-000000000001', NULL,
    'SMS', '11111111-0000-0000-0000-000000000006',
    '+91XXXXXXXXX6', 'CRITICAL_ALERT',
    'sns-msg-id-0001', NULL,
    TRUE, '2024-11-19 14:30:30+05:30'
),
(
    'aaaaaaaa-0000-0000-0000-000000000001', NULL,
    'EMAIL', '11111111-0000-0000-0000-000000000006',
    'suresh.kumar@villupuram.gov.in', 'CRITICAL_ALERT',
    NULL, 'ses-msg-id-0001',
    TRUE, '2024-11-19 14:30:45+05:30'
),
-- CRITICAL alert → Email to district collector (anomaly 1)
(
    'aaaaaaaa-0000-0000-0000-000000000001', NULL,
    'EMAIL', '11111111-0000-0000-0000-000000000004',
    'ramesh.babu@villupuram.gov.in', 'CRITICAL_ALERT',
    NULL, 'ses-msg-id-0002',
    TRUE, '2024-11-19 14:31:00+05:30'
),

-- HIGH alert → Email to block officer (anomaly 2)
(
    'aaaaaaaa-0000-0000-0000-000000000002', NULL,
    'EMAIL', '11111111-0000-0000-0000-000000000005',
    'anitha.devi@chengalpattu.gov.in', 'HIGH_ALERT',
    NULL, 'ses-msg-id-0003',
    TRUE, '2024-11-19 16:00:30+05:30'
),

-- HIGH alert → SMS + Email to district collector (anomaly 3)
(
    'aaaaaaaa-0000-0000-0000-000000000003', NULL,
    'SMS', '11111111-0000-0000-0000-000000000004',
    '+91XXXXXXXXX4', 'HIGH_ALERT',
    'sns-msg-id-0002', NULL,
    TRUE, '2024-11-18 22:00:30+05:30'
),
(
    'aaaaaaaa-0000-0000-0000-000000000003', NULL,
    'EMAIL', '11111111-0000-0000-0000-000000000004',
    'ramesh.babu@villupuram.gov.in', 'HIGH_ALERT',
    NULL, 'ses-msg-id-0004',
    TRUE, '2024-11-18 22:01:00+05:30'
),

-- Daily digest → Email to district collectors (linked to daily_reports via subquery)
(
    NULL,
    (SELECT id FROM daily_reports WHERE district = 'Villupuram' AND report_date = '2024-11-19' LIMIT 1),
    'EMAIL', '11111111-0000-0000-0000-000000000004',
    'ramesh.babu@villupuram.gov.in', 'DAILY_DIGEST',
    NULL, 'ses-msg-id-0005',
    TRUE, '2024-11-19 23:00:30+05:30'
),
(
    NULL,
    (SELECT id FROM daily_reports WHERE district = 'Villupuram' AND report_date = '2024-11-19' LIMIT 1),
    'EMAIL', '11111111-0000-0000-0000-000000000002',
    'karthikeyan.s@tn.welfare.gov.in', 'DAILY_DIGEST',
    NULL, 'ses-msg-id-0006',
    TRUE, '2024-11-19 23:01:00+05:30'
);


-- ============================================================
-- dashboard_sessions — 6 mock login sessions
-- ============================================================

INSERT INTO dashboard_sessions (officer_id, cognito_token_jti, ip_address, user_agent, login_at, last_active_at, logout_at) VALUES
(
    '11111111-0000-0000-0000-000000000001',
    'jti-token-central-20241119-01',
    '10.0.1.50',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
    '2024-11-19 09:00:00+05:30',
    '2024-11-19 17:45:00+05:30',
    '2024-11-19 18:00:00+05:30'
),
(
    '11111111-0000-0000-0000-000000000002',
    'jti-token-state-20241119-01',
    '10.0.2.22',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) Safari/605.1',
    '2024-11-19 08:30:00+05:30',
    '2024-11-19 16:30:00+05:30',
    NULL  -- still active
),
(
    '11111111-0000-0000-0000-000000000003',
    'jti-token-dist-cheng-20241119-01',
    '10.0.3.15',
    'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile',
    '2024-11-19 10:00:00+05:30',
    '2024-11-19 18:00:00+05:30',
    '2024-11-19 18:05:00+05:30'
),
(
    '11111111-0000-0000-0000-000000000004',
    'jti-token-dist-villu-20241119-01',
    '10.0.4.8',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/131.0',
    '2024-11-19 14:35:00+05:30',
    '2024-11-19 22:30:00+05:30',
    '2024-11-19 23:00:00+05:30'
),
(
    '11111111-0000-0000-0000-000000000005',
    'jti-token-block-madur-20241119-01',
    '10.0.5.3',
    'Mozilla/5.0 (Linux; Android 13) Chrome/129.0 Mobile',
    '2024-11-19 16:05:00+05:30',
    '2024-11-19 19:00:00+05:30',
    '2024-11-19 19:10:00+05:30'
),
(
    '11111111-0000-0000-0000-000000000006',
    'jti-token-block-vikra-20241119-01',
    '10.0.6.12',
    'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile',
    '2024-11-19 14:32:00+05:30',
    '2024-11-19 20:00:00+05:30',
    '2024-11-19 20:15:00+05:30'
);


-- ============================================================
-- END OF MOCK DATA
-- ============================================================
