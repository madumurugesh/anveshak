-- Cleanup script: remove old mock data, then re-run 10k mock data
-- Run this AFTER init.sql has been run at least once

-- Truncate in FK-safe order (cascade handles dependencies)
TRUNCATE TABLE dashboard_sessions CASCADE;
TRUNCATE TABLE notification_log CASCADE;
TRUNCATE TABLE daily_reports CASCADE;
TRUNCATE TABLE alert_actions CASCADE;
TRUNCATE TABLE ai_prompt_log CASCADE;
TRUNCATE TABLE anomaly_records CASCADE;
TRUNCATE TABLE district_baselines CASCADE;
TRUNCATE TABLE rejected_responses CASCADE;
TRUNCATE TABLE daily_responses CASCADE;
TRUNCATE TABLE beneficiaries CASCADE;

-- Re-insert officers (needed for FK references, not truncated but might be missing)
INSERT INTO officers (id, name, email, role, district, block, state) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Priya Kumari',   'priya@tn.gov.in',    'DISTRICT_OFFICER', 'Chengalpattu', NULL,            'Tamil Nadu'),
  ('a0000000-0000-0000-0000-000000000002', 'Rajan Murugan',  'rajan@tn.gov.in',    'BLOCK_OFFICER',    'Chengalpattu', 'Madurantakam',  'Tamil Nadu'),
  ('a0000000-0000-0000-0000-000000000003', 'Selvi Devi',     'selvi@tn.gov.in',    'DISTRICT_OFFICER', 'Villupuram',   NULL,            'Tamil Nadu'),
  ('a0000000-0000-0000-0000-000000000004', 'Karthik Subash', 'karthik@tn.gov.in',  'STATE_ADMIN',      NULL,           NULL,            'Tamil Nadu')
ON CONFLICT (id) DO NOTHING;

-- Re-insert scheme_config (scheme analytics depends on this table)
INSERT INTO scheme_config (scheme_id, scheme_name_en, scheme_name_ta, distribution_day_start, distribution_day_end, survey_window_days, min_expected_response_rate) VALUES
  ('PDS',             'Public Distribution System',  'பொது விநியோக முறை',       1,  5,  7, 0.200),
  ('PM_KISAN',        'PM Kisan Samman Nidhi',       'பிஎம் கிசான்',             1,  5, 10, 0.150),
  ('OLD_AGE_PENSION', 'Old Age Pension',             'முதியோர் ஓய்வூதியம்',      1,  3,  7, 0.100),
  ('LPG',             'LPG Subsidy (PAHAL/DBTL)',    'எல்பிஜி மானியம்',          1, 30, 30, 0.120)
ON CONFLICT (scheme_id) DO NOTHING;

-- Re-insert init.sql seed beneficiaries
INSERT INTO beneficiaries (phone_hash, name, scheme_id, pincode, block, district, state, age, gender) VALUES
  ('a1b2c3d4e5f6a7b8', 'Rama Krishnan',    'PDS',             '603001', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 45, 'M'),
  ('b2c3d4e5f6a7b8c9', 'Lakshmi Devi',      'PM_KISAN',        '605001', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 38, 'F'),
  ('c3d4e5f6a7b8c9d0', 'Murugan Selvam',    'OLD_AGE_PENSION', '608001', 'Chidambaram',  'Cuddalore',    'Tamil Nadu', 72, 'M'),
  ('d4e5f6a7b8c9d0e1', 'Parvathi Ammal',    'LPG',             '603001', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 55, 'F'),
  ('e5f6a7b8c9d0e1f2', 'Senthil Kumar',     'PDS',             '605001', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 30, 'M'),
  ('f6a7b8c9d0e1f2a3', 'Kavitha Rajan',     'PM_KISAN',        '608001', 'Chidambaram',  'Cuddalore',    'Tamil Nadu', 42, 'F'),
  ('a7b8c9d0e1f2a3b4', 'Gopal Natarajan',   'OLD_AGE_PENSION', '603001', 'Madurantakam', 'Chengalpattu', 'Tamil Nadu', 68, 'M'),
  ('b8c9d0e1f2a3b4c5', 'Sundari Murugesan', 'LPG',             '605001', 'Vikravandi',   'Villupuram',   'Tamil Nadu', 48, 'F')
ON CONFLICT (phone_hash) DO NOTHING;

-- Re-insert district baselines from init.sql
INSERT INTO district_baselines (district, block, scheme_id, computed_date, avg_no_pct, std_dev_no_pct, avg_total_responses, avg_response_rate, sample_days) VALUES
  ('Chengalpattu', 'Madurantakam', 'PDS',             '2025-01-01', 0.22, 0.05, 45, 0.30, 7),
  ('Chengalpattu', 'Madurantakam', 'PM_KISAN',        '2025-01-01', 0.18, 0.04, 38, 0.28, 7),
  ('Chengalpattu', 'Madurantakam', 'OLD_AGE_PENSION', '2025-01-01', 0.25, 0.06, 20, 0.22, 7),
  ('Chengalpattu', 'Madurantakam', 'LPG',             '2025-01-01', 0.20, 0.05, 32, 0.26, 7),
  ('Villupuram',   'Vikravandi',   'PDS',             '2025-01-01', 0.28, 0.07, 52, 0.25, 7),
  ('Villupuram',   'Vikravandi',   'PM_KISAN',        '2025-01-01', 0.21, 0.05, 30, 0.20, 7),
  ('Cuddalore',    'Chidambaram',  'PDS',             '2025-01-01', 0.24, 0.06, 40, 0.28, 7),
  ('Cuddalore',    'Chidambaram',  'OLD_AGE_PENSION', '2025-01-01', 0.30, 0.08, 18, 0.18, 7)
ON CONFLICT DO NOTHING;
