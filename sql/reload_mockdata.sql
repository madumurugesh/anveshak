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

-- Re-insert init.sql seed data for officers (they are NOT truncated)
-- Officers table has FK refs, so we don't truncate it.
-- But beneficiaries seed data needs to be re-inserted:
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
