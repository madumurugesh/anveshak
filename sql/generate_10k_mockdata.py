"""
Generate ~10,000 additional mock data rows for WelfareWatch.
Schema matches sql/init.sql (the actual RDS schema).
Run: python generate_10k_mockdata.py
"""
import random
import hashlib
import uuid
from datetime import datetime, timedelta, date

random.seed(42)

# ── Reference Data ──────────────────────────────────────────────
SCHEMES = ['PDS', 'PM_KISAN', 'OLD_AGE_PENSION', 'LPG']
GENDERS = ['M', 'F']
REJECTION_REASONS = ['UNREGISTERED', 'DUPLICATE', 'INVALID_INPUT', 'INACTIVE_BENEFICIARY']
DETECTOR_TYPES = ['NO_SPIKE', 'SILENCE', 'DUPLICATE_BENEFICIARY', 'DISTRICT_ROLLUP']
SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
STATUSES = ['NEW', 'ASSIGNED', 'INVESTIGATING', 'FIELD_VISIT', 'RESOLVED', 'ESCALATED']
AI_CLASSIFICATIONS = ['SUPPLY_FAILURE', 'DEMAND_COLLAPSE', 'FRAUD_PATTERN', 'DATA_ARTIFACT']
URGENCIES = ['TODAY', 'THIS_WEEK', 'MONITOR']
ACTION_TYPES = ['ASSIGNED', 'INVESTIGATING', 'FIELD_VISIT_STARTED', 'FIELD_VISIT_COMPLETED', 'ESCALATED', 'RESOLVED', 'NOTE_ADDED']
NOTIF_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP']
MESSAGE_TYPES = ['CRITICAL_ALERT', 'HIGH_ALERT', 'DAILY_DIGEST']

DISTRICTS = {
    'Chengalpattu': {
        'blocks': {
            'Madurantakam': ['603001', '603002', '603003', '603004'],
            'Thiruporur':   ['603101', '603102', '603103'],
            'Kattankulathur':['603201', '603202', '603203'],
        },
        'state': 'Tamil Nadu',
    },
    'Villupuram': {
        'blocks': {
            'Vikravandi':   ['605001', '605002', '605003', '605004'],
            'Ulundurpet':   ['606101', '606102', '606103'],
            'Kallakurichi': ['606201', '606202', '606203'],
            'Gingee':       ['604201', '604202'],
        },
        'state': 'Tamil Nadu',
    },
    'Cuddalore': {
        'blocks': {
            'Chidambaram':  ['608001', '608002', '608003'],
            'Kurinjipadi':  ['607301', '607302'],
            'Panruti':      ['607101', '607102', '607103'],
        },
        'state': 'Tamil Nadu',
    },
    'Kanchipuram': {
        'blocks': {
            'Sriperumbudur': ['602101', '602102', '602103'],
            'Uthiramerur':   ['603401', '603402'],
            'Walajabad':     ['631601', '631602'],
        },
        'state': 'Tamil Nadu',
    },
    'Salem': {
        'blocks': {
            'Attur':  ['636101', '636102', '636103'],
            'Mettur': ['636401', '636402'],
            'Omalur': ['636201', '636202'],
        },
        'state': 'Tamil Nadu',
    },
    'Madurai': {
        'blocks': {
            'Melur':    ['625101', '625102', '625103'],
            'Vadipatti': ['625218', '625219'],
            'Usilampatti':['625532', '625533'],
        },
        'state': 'Tamil Nadu',
    },
    'Coimbatore': {
        'blocks': {
            'Pollachi':  ['642001', '642002', '642003'],
            'Sulur':     ['641401', '641402'],
            'Kinathukadavu':['642109', '642110'],
        },
        'state': 'Tamil Nadu',
    },
    'Tirunelveli': {
        'blocks': {
            'Palayamkottai': ['627001', '627002', '627003'],
            'Ambasamudram':  ['627401', '627402'],
            'Cheranmahadevi':['627414', '627415'],
        },
        'state': 'Tamil Nadu',
    },
}

FIRST_NAMES_M = [
    'Ramu', 'Selvam', 'Murugesan', 'Govindasamy', 'Arjunan', 'Siva', 'Venkataraman',
    'Krishnaswamy', 'Babu', 'Thilagan', 'Manikandan', 'Arumugam', 'Sathishkumar',
    'Durai', 'Palani', 'Sundaram', 'Ramasamy', 'Senthil', 'Kumar', 'Ganesh',
    'Vijay', 'Rajesh', 'Suresh', 'Mohan', 'Karthik', 'Prakash', 'Bala', 'Anand',
    'Dinesh', 'Harish', 'Jayaram', 'Natesan', 'Perumal', 'Shankar', 'Velu',
    'Ramachandran', 'Subramanian', 'Chinnasamy', 'Muthu', 'Saravanan',
]
FIRST_NAMES_F = [
    'Lakshmi', 'Kamala', 'Valli', 'Radha', 'Chitra', 'Saraswathi', 'Muthulakshmi',
    'Parvathy', 'Sumathi', 'Ponni', 'Thangamani', 'Kamatchi', 'Vennila', 'Meenakshi',
    'Sakunthala', 'Nirmala', 'Kalpana', 'Rani', 'Geetha', 'Preethi',
    'Anitha', 'Bhavani', 'Devi', 'Eswari', 'Gomathi', 'Hema', 'Indra',
    'Jayanthi', 'Kavitha', 'Lalitha', 'Malathi', 'Nalini', 'Padma', 'Revathi',
    'Saroja', 'Thenmozhi', 'Uma', 'Vasanthi', 'Yamuna', 'Gowri',
]
LAST_NAMES = [
    'Murugan', 'Arumugam', 'Rajan', 'Pandian', 'Sundaram', 'Pillai', 'Naicker',
    'Gounder', 'Nadar', 'Thevar', 'Iyer', 'Iyengar', 'Subramaniam', 'Rajendran',
    'Mohan', 'Suresh', 'Nair', 'Krishnamurthy', 'Balasubramanian', 'Devi',
    'Chettiar', 'Udayar', 'Vannar', 'Achari', 'Konar', 'Paramasivam',
    'Ramakrishnan', 'Natarajan', 'Palaniswamy', 'Thangaraj',
]

# Officer IDs from init.sql seed data
OFFICER_IDS = [
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
]

# ── Date range ──────────────────────────────────────────────────
DATE_START = date(2024, 10, 1)
DATE_END = date(2026, 3, 7)
ALL_DATES = []
d = DATE_START
while d <= DATE_END:
    ALL_DATES.append(d)
    d += timedelta(days=1)

# ── Helpers ─────────────────────────────────────────────────────
def sql_str(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def sql_ts(dt_obj):
    if dt_obj is None:
        return 'NULL'
    return "'" + dt_obj.strftime('%Y-%m-%d %H:%M:%S+05:30') + "'"

def sql_date(d_obj):
    return "'" + d_obj.strftime('%Y-%m-%d') + "'"

def sql_num(n):
    if n is None:
        return 'NULL'
    return str(n)

def sql_bool(b):
    return 'TRUE' if b else 'FALSE'

def new_uuid():
    return str(uuid.uuid4())

def phone_hash(idx):
    return hashlib.sha256(f'phone_{idx}'.encode()).hexdigest()[:16]

def random_ts(d_obj, hour_start=6, hour_end=22):
    h = random.randint(hour_start, hour_end)
    m = random.randint(0, 59)
    s = random.randint(0, 59)
    return datetime(d_obj.year, d_obj.month, d_obj.day, h, m, s)

def all_pincodes():
    pins = []
    for dist, info in DISTRICTS.items():
        for block, codes in info['blocks'].items():
            for pin in codes:
                pins.append((pin, block, dist, info['state']))
    return pins

ALL_PINCODES = all_pincodes()

# ── Collect all lines ───────────────────────────────────────────
lines = []
lines.append("-- ============================================================")
lines.append("-- WelfareWatch — 10K Additional Mock Data")
lines.append("-- Auto-generated. Run AFTER init.sql")
lines.append("-- Schema: matches sql/init.sql")
lines.append("-- ============================================================")
lines.append("")

record_count = 0

# ════════════════════════════════════════════════════════════════
# 1. BENEFICIARIES
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- beneficiaries — additional records")
lines.append("-- ============================================================")
lines.append("")

ben_rows = []
ben_idx = 100

for pin, block, district, state in ALL_PINCODES:
    for scheme in SCHEMES:
        count = random.randint(5, 15)
        for _ in range(count):
            ben_idx += 1
            ph = phone_hash(ben_idx)
            gender = random.choice(GENDERS)
            name_first = random.choice(FIRST_NAMES_M if gender == 'M' else FIRST_NAMES_F)
            name_last = random.choice(LAST_NAMES)
            name = f'{name_first} {name_last}'
            age = random.randint(18, 92) if scheme != 'OLD_AGE_PENSION' else random.randint(60, 95)
            is_active = random.random() > 0.05
            lang = random.choices(['TA', 'HI', 'TE', 'KN'], weights=[85, 5, 5, 5])[0]

            ben_rows.append(
                f"({sql_str(ph)}, {sql_str(name)}, {sql_str(scheme)}, "
                f"{sql_str(pin)}, {sql_str(block)}, {sql_str(district)}, {sql_str(state)}, "
                f"{sql_num(age)}, {sql_str(gender)}, {sql_bool(is_active)}, {sql_str(lang)})"
            )

for i in range(0, len(ben_rows), 500):
    batch = ben_rows[i:i+500]
    lines.append("INSERT INTO beneficiaries (phone_hash, name, scheme_id, pincode, block, district, state, age, gender, is_active, language_pref) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(ben_rows)

# ════════════════════════════════════════════════════════════════
# 2. DAILY_RESPONSES (with ON CONFLICT for unique constraint)
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- daily_responses — aggregated daily data")
lines.append("-- ============================================================")
lines.append("")

dr_rows = []
sample_dates = sorted(random.sample(ALL_DATES, min(50, len(ALL_DATES))))
seen_dr = set()

for d_obj in sample_dates:
    for pin, block, district, state in ALL_PINCODES:
        for scheme in SCHEMES:
            if random.random() > 0.35:
                continue
            key = f"{pin}|{scheme}|{d_obj}"
            if key in seen_dr:
                continue
            seen_dr.add(key)
            active_ben = random.randint(30, 300)
            total = random.randint(10, int(active_ben * 0.8))
            is_anomaly = random.random() < 0.03
            if is_anomaly:
                no_pct = round(random.uniform(0.50, 0.90), 4)
            else:
                no_pct = round(random.uniform(0.10, 0.35), 4)
            no_count = int(total * no_pct)
            yes_count = total - no_count
            response_rate = round(total / active_ben, 4)

            dr_rows.append(
                f"({sql_date(d_obj)}, {sql_str(pin)}, {sql_str(scheme)}, "
                f"{sql_str(block)}, {sql_str(district)}, {sql_str(state)}, "
                f"{sql_num(yes_count)}, {sql_num(no_count)}, {sql_num(total)}, "
                f"{sql_num(no_pct)}, {sql_num(active_ben)}, {sql_num(response_rate)})"
            )

for i in range(0, len(dr_rows), 500):
    batch = dr_rows[i:i+500]
    lines.append("INSERT INTO daily_responses (date, pincode, scheme_id, block, district, state, yes_count, no_count, total_responses, no_pct, active_beneficiaries, response_rate) VALUES")
    lines.append(',\n'.join(batch))
    lines.append("ON CONFLICT (pincode, scheme_id, date) DO NOTHING;")
    lines.append("")
record_count += len(dr_rows)

# ════════════════════════════════════════════════════════════════
# 3. REJECTED_RESPONSES
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- rejected_responses")
lines.append("-- ============================================================")
lines.append("")

rejected_rows = []
rej_dates = sorted(random.sample(ALL_DATES, min(20, len(ALL_DATES))))

for d_obj in rej_dates:
    count = random.randint(15, 25)
    for _ in range(count):
        call_sid = f"CA{random.randint(90000,99999)}-{uuid.uuid4().hex[:6]}"
        ph = phone_hash(random.randint(1, ben_idx + 500))
        scheme = random.choice(SCHEMES)
        reason = random.choice(REJECTION_REASONS)
        digit = str(random.randint(0, 9))
        ts = random_ts(d_obj)

        rejected_rows.append(
            f"({sql_str(call_sid)}, {sql_str(ph)}, {sql_str(scheme)}, "
            f"{sql_str(reason)}, {sql_str(digit)}, {sql_ts(ts)})"
        )

for i in range(0, len(rejected_rows), 500):
    batch = rejected_rows[i:i+500]
    lines.append("INSERT INTO rejected_responses (call_sid, phone_hash, scheme_id, rejection_reason, raw_digit, rejected_at) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(rejected_rows)

# ════════════════════════════════════════════════════════════════
# 4. DISTRICT_BASELINES
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- district_baselines")
lines.append("-- ============================================================")
lines.append("")

db_rows = []
sundays = [d for d in ALL_DATES if d.weekday() == 6]

for sunday in sundays[:12]:
    for dist, info in DISTRICTS.items():
        for block in info['blocks']:
            for scheme in SCHEMES:
                avg_no = round(random.uniform(0.15, 0.32), 4)
                std_dev = round(random.uniform(0.02, 0.12), 4)
                avg_total = round(random.uniform(15, 60), 2)
                avg_rr = round(random.uniform(0.15, 0.35), 4)
                db_rows.append(
                    f"({sql_str(dist)}, {sql_str(block)}, {sql_str(scheme)}, "
                    f"{sql_date(sunday)}, {sql_num(avg_no)}, {sql_num(std_dev)}, "
                    f"{sql_num(avg_total)}, {sql_num(avg_rr)}, 7)"
                )
        for scheme in random.sample(SCHEMES, 2):
            avg_no = round(random.uniform(0.18, 0.30), 4)
            std_dev = round(random.uniform(0.02, 0.10), 4)
            avg_total = round(random.uniform(60, 200), 2)
            avg_rr = round(random.uniform(0.20, 0.30), 4)
            db_rows.append(
                f"({sql_str(dist)}, NULL, {sql_str(scheme)}, "
                f"{sql_date(sunday)}, {sql_num(avg_no)}, {sql_num(std_dev)}, "
                f"{sql_num(avg_total)}, {sql_num(avg_rr)}, 7)"
            )

for i in range(0, len(db_rows), 500):
    batch = db_rows[i:i+500]
    lines.append("INSERT INTO district_baselines (district, block, scheme_id, computed_date, avg_no_pct, std_dev_no_pct, avg_total_responses, avg_response_rate, sample_days) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(db_rows)

# ════════════════════════════════════════════════════════════════
# 5. ANOMALY_RECORDS (MUST come before ai_prompt_log & alert_actions)
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- anomaly_records — detected anomalies")
lines.append("-- ============================================================")
lines.append("")

anomaly_rows = []
anomaly_ids = []

anomaly_dates = sorted(random.sample(ALL_DATES, min(40, len(ALL_DATES))))
for d_obj in anomaly_dates:
    count = random.randint(5, 10)
    for _ in range(count):
        aid = new_uuid()
        detector = random.choice(DETECTOR_TYPES)
        severity = random.choices(SEVERITIES, weights=[10, 25, 40, 25])[0]
        status = random.choice(STATUSES)
        scheme = random.choice(SCHEMES)
        pin_data = random.choice(ALL_PINCODES)
        pin, block, district, state = pin_data

        if detector == 'DISTRICT_ROLLUP':
            level = 'DISTRICT'
            pin_val = 'NULL'
            block_val = 'NULL'
        elif detector == 'SILENCE':
            level = 'PINCODE'
            pin_val = sql_str(pin)
            block_val = sql_str(block)
        else:
            level = random.choice(['PINCODE', 'BLOCK'])
            pin_val = sql_str(pin) if level == 'PINCODE' else 'NULL'
            block_val = sql_str(block)

        score = round(random.uniform(0.3, 5.0), 4)
        no_pct = round(random.uniform(0.40, 0.90), 4) if detector != 'SILENCE' else 'NULL'
        baseline_no = round(random.uniform(0.15, 0.35), 4) if detector != 'SILENCE' else 'NULL'
        total_resp = random.randint(10, 500)
        affected = random.randint(total_resp, total_resp * 3)

        ai_class = random.choice(AI_CLASSIFICATIONS)
        ai_conf = round(random.uniform(0.55, 0.95), 3)
        ai_reasoning = f"{detector} detected: score {score} in {district}/{block or 'district-wide'} for {scheme}"
        ai_action = f"Investigate {severity.lower()} anomaly in {district} for {scheme}."
        ai_urgency = random.choice(URGENCIES)
        officer = random.choice(OFFICER_IDS) if status != 'NEW' else 'NULL'

        ts = random_ts(d_obj, 8, 22)

        raw_data = f'{{"score": {score}, "detector": "{detector}", "district": "{district}"}}'

        anomaly_ids.append((aid, d_obj, ts, severity, district, scheme))

        anomaly_rows.append(
            f"({sql_str(aid)}, {sql_date(d_obj)}, {sql_str(detector)}, {sql_str(level)}, "
            f"{pin_val}, {block_val}, {sql_str(district)}, {sql_str(state)}, {sql_str(scheme)}, "
            f"{sql_str(severity)}, {sql_num(score)}, {sql_num(no_pct)}, {sql_num(baseline_no)}, "
            f"{sql_num(total_resp)}, {sql_num(affected)}, "
            f"{sql_str(raw_data)}::JSONB, "
            f"{sql_str(ai_class)}, {sql_num(ai_conf)}, {sql_str(ai_reasoning)}, "
            f"{sql_str(ai_action)}, NULL, "
            f"{sql_str(ai_urgency)}, {sql_str(status)}, "
            f"{sql_str(officer) if officer != 'NULL' else 'NULL'}, {sql_ts(ts)})"
        )

for i in range(0, len(anomaly_rows), 200):
    batch = anomaly_rows[i:i+200]
    lines.append("INSERT INTO anomaly_records (id, date, detector_type, level, pincode, block, district, state, scheme_id, severity, score, no_pct, baseline_no_pct, total_responses, affected_beneficiaries, raw_data, ai_classification, ai_confidence, ai_reasoning, ai_action, ai_action_ta, ai_urgency, status, assigned_officer_id, created_at) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(anomaly_rows)

# ════════════════════════════════════════════════════════════════
# 6. AI_PROMPT_LOG (depends on anomaly_records)
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- ai_prompt_log — AI engine call logs")
lines.append("-- ============================================================")
lines.append("")

ai_rows = []
for aid, d_obj, ts, severity, district, scheme in anomaly_ids:
    prompt_tokens = random.randint(600, 1200)
    completion_tokens = random.randint(100, 300)
    total_tokens = prompt_tokens + completion_tokens
    cost = round(total_tokens * 0.00000025, 6)
    latency = random.randint(800, 4000)
    called_at = ts + timedelta(minutes=random.randint(1, 15))
    success = random.random() > 0.02
    error = None if success else 'OpenAI rate limit exceeded'

    ai_rows.append(
        f"({sql_str(aid)}, 'ai-anomaly-engine', 'gpt-4o-mini', "
        f"{sql_num(prompt_tokens)}, {sql_num(completion_tokens)}, {sql_num(total_tokens)}, "
        f"{sql_num(cost)}, {sql_str(f'prompt for anomaly {aid[:8]}')}, "
        f"{sql_str(f'response for {severity} {scheme} in {district}')}, "
        f"{sql_bool(success)}, {sql_str(error)}, {sql_num(latency)}, {sql_ts(called_at)})"
    )

for i in range(0, len(ai_rows), 500):
    batch = ai_rows[i:i+500]
    lines.append("INSERT INTO ai_prompt_log (anomaly_record_id, lambda_name, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, prompt_text, response_text, success, error_message, latency_ms, called_at) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(ai_rows)

# ════════════════════════════════════════════════════════════════
# 7. ALERT_ACTIONS (depends on anomaly_records + officers)
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- alert_actions — officer actions on anomalies")
lines.append("-- ============================================================")
lines.append("")

alert_rows = []
for aid, d_obj, ts, severity, district, scheme in anomaly_ids:
    num_actions = random.randint(1, 3)
    action_sequence = random.sample(ACTION_TYPES, min(num_actions, len(ACTION_TYPES)))
    for j, action in enumerate(action_sequence):
        officer = random.choice(OFFICER_IDS)
        action_ts = ts + timedelta(minutes=random.randint(5, 120) * (j + 1))
        notes = f"{action.replace('_', ' ').title()} for {severity} anomaly in {district} - {scheme}"

        alert_rows.append(
            f"({sql_str(aid)}, {sql_str(officer)}, {sql_str(action)}, "
            f"{sql_str(notes)}, {sql_ts(action_ts)})"
        )

for i in range(0, len(alert_rows), 500):
    batch = alert_rows[i:i+500]
    lines.append("INSERT INTO alert_actions (anomaly_record_id, officer_id, action_type, notes, created_at) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(alert_rows)

# ════════════════════════════════════════════════════════════════
# 8. DAILY_REPORTS (NO narrative_text column)
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- daily_reports")
lines.append("-- ============================================================")
lines.append("")

report_rows = []
report_ids = []
report_dates = sorted(random.sample(ALL_DATES, min(10, len(ALL_DATES))))

for d_obj in report_dates:
    for dist in DISTRICTS:
        rid = new_uuid()
        total_resp = random.randint(500, 8000)
        total_anom = random.randint(0, 5)
        critical = random.randint(0, min(2, total_anom))
        high = random.randint(0, total_anom - critical)
        medium = total_anom - critical - high
        best_block = random.choice(list(DISTRICTS[dist]['blocks'].keys()))
        worst_pin = random.choice(list(DISTRICTS[dist]['blocks'].values()))[0]
        gen_at = datetime(d_obj.year, d_obj.month, d_obj.day, 22, 45, 0)
        schemes_json = '{"PDS": {"responses": ' + str(random.randint(200,3000)) + ', "no_pct": ' + str(round(random.uniform(0.15,0.40),2)) + '}, "PM_KISAN": {"responses": ' + str(random.randint(100,2000)) + ', "no_pct": ' + str(round(random.uniform(0.15,0.35),2)) + '}}'

        report_ids.append((rid, d_obj, dist))

        report_rows.append(
            f"({sql_str(rid)}, {sql_str(dist)}, {sql_date(d_obj)}, "
            f"{sql_num(total_resp)}, {sql_num(total_anom)}, {sql_num(critical)}, "
            f"{sql_num(high)}, {sql_num(medium)}, {sql_str(schemes_json)}::JSONB, "
            f"{sql_str(best_block)}, {sql_str(worst_pin)}, TRUE, {sql_ts(gen_at + timedelta(minutes=15))}, {sql_ts(gen_at)})"
        )

for i in range(0, len(report_rows), 500):
    batch = report_rows[i:i+500]
    lines.append("INSERT INTO daily_reports (id, district, report_date, total_responses, total_anomalies, critical_count, high_count, medium_count, schemes_summary, best_performing_block, worst_performing_pincode, email_sent, email_sent_at, generated_at) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(report_rows)

# ════════════════════════════════════════════════════════════════
# 9. NOTIFICATION_LOG (NO anomaly_record_id, recipient_officer_id, sns/ses ids)
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- notification_log")
lines.append("-- ============================================================")
lines.append("")

notif_rows = []

for rid, d_obj, district in report_ids:
    for _ in range(random.randint(1, 3)):
        channel = random.choice(NOTIF_CHANNELS)
        msg_type = random.choice(MESSAGE_TYPES)
        if channel == 'EMAIL':
            addr = f'officer{random.randint(1,20)}@tn.gov.in'
        else:
            addr = f'+91{random.randint(7000000000, 9999999999)}'
        gen_at = datetime(d_obj.year, d_obj.month, d_obj.day, 22, 45, 0)
        sent_at = gen_at + timedelta(minutes=random.randint(1, 30))

        notif_rows.append(
            f"({sql_str(rid)}, {sql_str(channel)}, {sql_str(msg_type)}, "
            f"{sql_str(addr)}, TRUE, {sql_ts(sent_at)})"
        )

for i in range(0, len(notif_rows), 500):
    batch = notif_rows[i:i+500]
    lines.append("INSERT INTO notification_log (report_id, channel, message_type, recipient_address, delivered, sent_at) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(notif_rows)

# ════════════════════════════════════════════════════════════════
# 10. DASHBOARD_SESSIONS (NO user_agent, NO cognito_token_jti)
# ════════════════════════════════════════════════════════════════
lines.append("-- ============================================================")
lines.append("-- dashboard_sessions")
lines.append("-- ============================================================")
lines.append("")

session_rows = []
session_dates = sorted(random.sample(ALL_DATES, min(20, len(ALL_DATES))))

for d_obj in session_dates:
    for officer in OFFICER_IDS:
        if random.random() > 0.6:
            continue
        ip = f'10.0.{random.randint(1,20)}.{random.randint(1,254)}'
        login = random_ts(d_obj, 7, 10)
        last_active = login + timedelta(hours=random.randint(2, 10))
        logout = last_active + timedelta(minutes=random.randint(5, 30)) if random.random() > 0.2 else None

        session_rows.append(
            f"({sql_str(officer)}, {sql_str(ip)}, "
            f"{sql_ts(login)}, {sql_ts(last_active)}, {sql_ts(logout)})"
        )

for i in range(0, len(session_rows), 500):
    batch = session_rows[i:i+500]
    lines.append("INSERT INTO dashboard_sessions (officer_id, ip_address, login_at, last_active_at, logout_at) VALUES")
    lines.append(',\n'.join(batch) + ';')
    lines.append("")
record_count += len(session_rows)

# ── Summary ─────────────────────────────────────────────────────
lines.append(f"-- ============================================================")
lines.append(f"-- TOTAL RECORDS GENERATED: {record_count}")
lines.append(f"-- ============================================================")

output = '\n'.join(lines)
with open('welfarewatch_10k_mockdata.sql', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"Generated {record_count} records -> welfarewatch_10k_mockdata.sql")
print(f"  beneficiaries:        {len(ben_rows)}")
print(f"  daily_responses:      {len(dr_rows)}")
print(f"  rejected_responses:   {len(rejected_rows)}")
print(f"  district_baselines:   {len(db_rows)}")
print(f"  anomaly_records:      {len(anomaly_rows)}")
print(f"  ai_prompt_log:        {len(ai_rows)}")
print(f"  alert_actions:        {len(alert_rows)}")
print(f"  daily_reports:        {len(report_rows)}")
print(f"  notification_log:     {len(notif_rows)}")
print(f"  dashboard_sessions:   {len(session_rows)}")
