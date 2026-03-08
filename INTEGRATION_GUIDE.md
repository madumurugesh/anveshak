# Anveshak — Comprehensive Codebase Report & Integration Guide

---

## Part 1: Comprehensive Codebase Report

### 1.1 Project Overview

**Anveshak** is an IVR (Interactive Voice Response) data pipeline for tracking citizen feedback on Indian government schemes. It processes citizen call responses, deduplicates them, aggregates metrics, and detects anomalies using AI.

The system consists of **three microservices** (only two are implemented so far):

| Service | Port | Status |
|---|---|---|
| **Ingestion Service** | 8000 | ✅ Implemented |
| **Stream Processing Service** | 8001 | ✅ Implemented |
| **Anomaly Detection Service** | 8002 | ❌ **NOT IMPLEMENTED** (only described in README) |

---

### 1.2 Data Flow (End-to-End)

```
Citizen IVR Call
      │
      ▼
┌──────────────────────────────────┐
│  1. Ingestion Service (port 8000)│
│     POST /api/ivr/webhook        │
│                                  │
│  a) Validate beneficiary (RDS)   │
│  b) Dedup check (DynamoDB)       │
│  c) Push to Kinesis stream       │
└──────────────┬───────────────────┘
               │
               ▼
      Kinesis Data Stream
      (ivr-responses-stream)
               │
               ▼
┌──────────────────────────────────────┐
│  2. Stream Processing Service (8001) │
│                                      │
│  a) Consume Kinesis records          │
│  b) Increment DynamoDB counters      │
│  c) Hourly flush → compute z-scores  │
│  d) Upsert into RDS daily_responses  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  3. Anomaly Detection Service (8002) │
│     ❌ NOT YET IMPLEMENTED           │
│                                      │
│  Supposed to:                        │
│  a) Read daily_responses from RDS    │
│  b) Flag rows with |z_score| >= 2.0  │
│  c) Send to OpenAI for analysis      │
│  d) Store report in anomaly_reports  │
└──────────────────────────────────────┘
```

---

### 1.3 File-by-File Analysis

#### A. SQL Schema (`sql/init.sql`)

| Table | Purpose | Used By |
|---|---|---|
| `beneficiaries` | Phone hash → citizen lookup | Ingestion Service (read) |
| `daily_responses` | Hourly aggregated metrics per pincode/scheme/date | Stream Processing (write), Anomaly Detection (read) |
| `anomaly_reports` | AI-generated analysis reports | Anomaly Detection (write) |

**Observations:**
- The `updated_at` column on `daily_responses` defaults to `now()` on INSERT but is **never updated on UPSERT** (the `ON CONFLICT ... DO UPDATE` in the worker does not touch `updated_at`).
- `anomaly_reports` table exists in SQL but no service writes to it yet.
- Test seed data is appended at the end of the migration — fine for dev, but should be separated for production.

---

#### B. Ingestion Service (`ingestion-service/`)

**`app/config.py`** — Pydantic-settings configuration loaded from `.env`.
- **Issue:** `aws_region` defaults to `ap-south-1` but the AWS_SETUP_GUIDE says to use `us-east-1` for Learner Labs. This mismatch will cause `ResourceNotFoundException` if the `.env` doesn't explicitly override `AWS_REGION`.

**`app/database.py`** — Async PostgreSQL connection pool via `asyncpg`.
- Clean singleton pattern with `get_pool()` / `close_pool()`.
- No SSL configuration — fine for Learner Labs, but would need `ssl='require'` for production RDS.

**`app/schemas.py`** — Pydantic request/response models.
- `IVRWebhookRequest`: validates `phone_hash`, `scheme_id`, 6-digit `pincode`, and `response_value` (1–5).
- `IVRWebhookResponse`: returns status, message, and optional Kinesis sequence number.

**`app/aws_clients.py`** — DynamoDB dedup + Kinesis producer.
- `check_and_set_dedup()`: Atomic conditional PutItem — if the PK (`phone_hash#scheme_id#date`) doesn't exist, insert it; otherwise it's a duplicate.
- **Issue:** The dedup entry does **not** include a `ttl` attribute, so even though the DynamoDB table has TTL enabled on the `ttl` attribute, items will **never auto-expire**. A `ttl` value (epoch timestamp) must be set during PutItem.
- `push_to_kinesis()`: Puts a JSON-serialized record using `pincode` as the partition key.
- **Issue:** A broken string literal `"r" "egion_name"` on line 10 — Python concatenates adjacent string literals, so it evaluates to `"region_name"` and works, but it's clearly an accidental line break in the code.

**`app/service.py`** — Core business logic.
- `verify_beneficiary()`: Checks if `phone_hash` exists in `beneficiaries` table.
- `process_ivr_payload()`: Orchestrates validate → dedup → stream. Clean separation of concerns.

**`app/routes.py`** — Single endpoint `POST /api/ivr/webhook`.
- Returns 403 for unknown beneficiary, 409 for duplicate, 200 for accepted.

**`app/main.py`** — FastAPI app with lifespan for PG pool init/cleanup.

**`Dockerfile`** — Standard Python 3.12-slim, exposes port 8000.

**`requirements.txt`** — `fastapi`, `uvicorn`, `aioboto3`, `asyncpg`, `pydantic`, `pydantic-settings`, `python-dotenv`.

---

#### C. Stream Processing Service (`stream-processing-service/`)

**`app/config.py`** — Same pattern as ingestion.
- **Same region default issue**: `ap-south-1` instead of `us-east-1`.
- Adds `window_seconds` (default 3600) and `dynamodb_table_agg`.

**`app/database.py`** — Identical to ingestion's database.py.

**`app/aws_clients.py`** — Kinesis consumer + DynamoDB aggregation.
- `get_shard_iterators()`: Gets LATEST iterator for each shard — this means **records published before the consumer starts are NOT processed** (only new records).
- `get_records()`: Fetches up to 100 records per call.
- `increment_counter()`: Atomically increments `total_count` and `response_sum` in DynamoDB using `ADD` expressions.
- `scan_today_aggregates()`: Full table scan filtered by today's date in the PK. Paginated correctly.

**`app/workers.py`** — Two background async tasks:
1. **`kinesis_consumer()`**: Infinite loop polling all shards every 1 second, parsing JSON records, and calling `increment_counter()`.
2. **`periodic_flush()`**: Every `WINDOW_SECONDS` (default 1h), reads DynamoDB aggregates, computes `no_pct` and `z_score`, and upserts into RDS `daily_responses`.

- `_compute_metrics()`: Computes:
  - `no_pct = ((total_count - response_sum) / total_count) * 100` — represents "negative" response rate.
  - `z_score` — standard deviation-based outlier scoring across all current buckets.
- **Issue:** `z_score` uses population variance (`/ len(values)`) rather than sample variance (`/ (len(values) - 1)`). For small bucket counts, this underestimates the standard deviation.
- **Issue:** When `variance` is 0 (all buckets have the same `no_pct`), `std` is set to `1.0` — this produces artificial z-scores rather than 0.

**`app/main.py`** — FastAPI app with lifespan that starts both background workers.
- Exposes `POST /admin/flush` for manual trigger (useful for testing).

**`Dockerfile`** — Exposes port 8001.

**`requirements.txt`** — Same as ingestion + `scipy` (imported but **never actually used** in any code file).

---

### 1.4 What's MISSING

| # | Gap | Severity | Details |
|---|---|---|---|
| 1 | **Anomaly Detection Service** | 🔴 High | Described in README, DB table created, but **no code exists** — no `anomaly-detection-service/` directory. |
| 2 | **DynamoDB TTL not set on dedup items** | 🟡 Medium | `response_dedup` table has TTL enabled on `ttl` attribute, but `check_and_set_dedup()` never writes a `ttl` value. Items accumulate forever. |
| 3 | **Region default mismatch** | 🟡 Medium | Both configs default `aws_region` to `ap-south-1`, but the guide says `us-east-1`. Users who forget `AWS_REGION` in `.env` will get errors. |
| 4 | **No `.env` files committed** | 🟡 Medium | `.env` files must be manually created (by design for security), but there are no `.env.example` template files to guide users. |
| 5 | **No `.gitignore`** | 🟡 Medium | No `.gitignore` file to prevent accidentally committing `.env` files with secrets. |
| 6 | **`updated_at` not refreshed on upsert** | 🟢 Low | The `daily_responses` upsert in `flush_to_rds()` doesn't update the `updated_at` column, so it always shows the first insert time. |
| 7 | **`scipy` unused** | 🟢 Low | `stream-processing-service/requirements.txt` includes `scipy==1.13.0` but it's never imported anywhere. |
| 8 | **No authentication on webhook** | 🟡 Medium | `POST /api/ivr/webhook` has no API key, JWT, or any auth. Anyone can submit fake IVR data. |
| 9 | **No authentication on admin endpoint** | 🟡 Medium | `POST /admin/flush` can be called by anyone — no protection. |
| 10 | **No `docker-compose.yml`** | 🟢 Low | No orchestration file to run both services together locally. |
| 11 | **No tests** | 🟡 Medium | Zero test files across the entire codebase. |
| 12 | **Kinesis consumer uses LATEST** | 🟢 Low | Records published before the consumer starts are lost. In production, you'd use `TRIM_HORIZON` or a checkpoint mechanism. |
| 13 | **DynamoDB scan for aggregation** | 🟢 Low | `scan_today_aggregates()` does a full table scan with a `contains(pk, :d)` filter. Efficient at low scale, but won't scale to millions of items. A GSI or query pattern would be better. |
| 14 | **No error retry / DLQ** | 🟢 Low | Failed Kinesis records are logged and skipped — no retry or dead-letter queue. |
| 15 | **Broken string literal** | 🟢 Low | `aws_clients.py` line 10 in ingestion-service has `"r" "egion_name"` — works due to Python string concatenation but is clearly a formatting accident. |

---

## Part 2: Detailed Integration Guide

### 2.1 Prerequisites

| Requirement | Details |
|---|---|
| **Python** | 3.12+ |
| **PostgreSQL client** | `psql` or pgAdmin (for running migrations) |
| **AWS Account** | Learner Lab session active (or any account with Kinesis + DynamoDB + RDS access) |
| **Docker** (optional) | For containerized deployment |

---

### 2.2 AWS Resources Setup

Follow `AWS_SETUP_GUIDE.md` to create these resources:

| Resource | Service | Name |
|---|---|---|
| PostgreSQL DB | RDS | `anveshak-db` |
| Dedup Table | DynamoDB | `response_dedup` (PK: `pk`, TTL attr: `ttl`) |
| Aggregation Table | DynamoDB | `responses_dynamo_ref` (PK: `pk`) |
| Data Stream | Kinesis | `ivr-responses-stream` (2 shards) |
| Security Group | VPC | `anveshak-rds-sg` (allow 5432 inbound) |

Run the database migration:
```bash
psql -h <RDS_ENDPOINT> -U anveshak_admin -d anveshak -f sql/init.sql
```

---

### 2.3 Environment Configuration

#### Step 1: Create `.env.example` templates

Create `ingestion-service/.env.example`:
```env
# PostgreSQL (RDS)
PG_HOST=anveshak-db.xxxxx.us-east-1.rds.amazonaws.com
PG_PORT=5432
PG_USER=anveshak_admin
PG_PASSWORD=CHANGE_ME
PG_DATABASE=anveshak

# DynamoDB
DYNAMODB_TABLE_DEDUP=response_dedup

# Kinesis
KINESIS_STREAM_NAME=ivr-responses-stream

# AWS — MUST be us-east-1 for Learner Labs
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
```

Create `stream-processing-service/.env.example`:
```env
# PostgreSQL (RDS)
PG_HOST=anveshak-db.xxxxx.us-east-1.rds.amazonaws.com
PG_PORT=5432
PG_USER=anveshak_admin
PG_PASSWORD=CHANGE_ME
PG_DATABASE=anveshak

# DynamoDB
DYNAMODB_TABLE_AGG=responses_dynamo_ref

# Kinesis
KINESIS_STREAM_NAME=ivr-responses-stream

# Processing window
WINDOW_SECONDS=3600

# AWS — MUST be us-east-1 for Learner Labs
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
```

#### Step 2: Create actual `.env` files

```bash
cd ingestion-service
cp .env.example .env
# Edit .env with your real values

cd ../stream-processing-service
cp .env.example .env
# Edit .env with your real values
```

Fill in:
- `PG_HOST` → your RDS endpoint (e.g., `anveshak-db.chi0c4240fnb.us-east-1.rds.amazonaws.com`)
- `PG_PASSWORD` → your RDS master password
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` → from Learner Lab "AWS Details"

---

### 2.4 Running the Services

#### Option A: Local (Development)

**Terminal 1 — Ingestion Service:**
```bash
cd ingestion-service
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Stream Processing Service:**
```bash
cd stream-processing-service
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

#### Option B: Docker

```bash
# Ingestion
cd ingestion-service
docker build -t anveshak-ingestion .
docker run --env-file .env -p 8000:8000 anveshak-ingestion

# Stream Processing
cd ../stream-processing-service
docker build -t anveshak-stream .
docker run --env-file .env -p 8001:8001 anveshak-stream
```

---

### 2.5 Integration Testing (Step-by-Step)

#### Step 1: Verify health endpoints

```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"ingestion"}

curl http://localhost:8001/health
# Expected: {"status":"ok","service":"stream-processing"}
```

#### Step 2: Seed a test beneficiary (if not already done)

```sql
-- Connect to RDS
psql -h <RDS_ENDPOINT> -U anveshak_admin -d anveshak

INSERT INTO beneficiaries (phone_hash, name, pincode)
VALUES ('abc123hash', 'Test Citizen 1', '560001')
ON CONFLICT (phone_hash) DO NOTHING;
```

#### Step 3: Submit a test IVR response

```bash
curl -X POST http://localhost:8000/api/ivr/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"phone_hash\": \"abc123hash\", \"scheme_id\": \"PM-KISAN\", \"pincode\": \"560001\", \"response_value\": 3}"
```

**Expected response:**
```json
{
  "status": "accepted",
  "message": "Response recorded",
  "kinesis_sequence": "4958..."
}
```

#### Step 4: Verify deduplication

Send the **same curl again** — expected:
```json
HTTP 409: {"detail": "Already responded today for this scheme"}
```

#### Step 5: Verify unknown beneficiary rejection

```bash
curl -X POST http://localhost:8000/api/ivr/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"phone_hash\": \"unknown_hash\", \"scheme_id\": \"PM-KISAN\", \"pincode\": \"560001\", \"response_value\": 3}"
```
**Expected:** HTTP 403 `"Unknown beneficiary"`

#### Step 6: Verify DynamoDB received the dedup + aggregation entries

Check `response_dedup` table in AWS Console → DynamoDB → Tables → response_dedup → Explore items.
You should see: `pk = abc123hash#PM-KISAN#2026-03-08`

Check `responses_dynamo_ref` table:
You should see: `pk = 560001#PM-KISAN#2026-03-08` with `total_count=1`, `response_sum=3`

#### Step 7: Trigger a manual flush to RDS

```bash
curl -X POST http://localhost:8001/admin/flush
# Expected: {"status":"flushed"}
```

#### Step 8: Verify data landed in RDS

```sql
SELECT * FROM daily_responses WHERE report_date = CURRENT_DATE;
```

Expected: One row with `pincode=560001`, `scheme_id=PM-KISAN`, `total_count=1`, `response_sum=3`.

---

### 2.6 How the Services Integrate (Data Contract)

```
┌─────────────────────────┐
│   Ingestion Service     │
│                         │
│ WRITES TO:              │
│  • RDS: reads           │
│    beneficiaries table  │
│  • DynamoDB: writes     │
│    response_dedup       │
│  • Kinesis: writes      │
│    ivr-responses-stream │
└────────────┬────────────┘
             │
             │  Kinesis Record Format (JSON):
             │  {
             │    "phone_hash": "abc123hash",
             │    "scheme_id": "PM-KISAN",
             │    "pincode": "560001",
             │    "response_value": 3
             │  }
             │
             ▼
┌─────────────────────────────┐
│  Stream Processing Service  │
│                             │
│ READS FROM:                 │
│  • Kinesis:                 │
│    ivr-responses-stream     │
│                             │
│ WRITES TO:                  │
│  • DynamoDB:                │
│    responses_dynamo_ref     │
│    (atomic counters:        │
│     total_count,            │
│     response_sum)           │
│  • RDS:                     │
│    daily_responses table    │
│    (hourly upsert with      │
│     no_pct and z_score)     │
└─────────────────────────────┘
```

**Key data contracts between services:**

| From | To | Medium | Schema |
|---|---|---|---|
| Ingestion → Stream Processing | Kinesis `ivr-responses-stream` | JSON with fields: `phone_hash`, `scheme_id`, `pincode`, `response_value` |
| Stream Processing → RDS | PostgreSQL `daily_responses` | Columns: `pincode`, `scheme_id`, `report_date`, `total_count`, `response_sum`, `no_pct`, `z_score` |
| (Future) Anomaly Service ← RDS | PostgreSQL `daily_responses` | Reads rows by `report_date` |
| (Future) Anomaly Service → RDS | PostgreSQL `anomaly_reports` | Writes `report_date`, `flagged_count`, `ai_summary` |

---

### 2.7 Recommended Fixes Before Production

#### Fix 1: Add TTL to dedup entries

In `ingestion-service/app/aws_clients.py`, add a `ttl` attribute to prevent unbounded growth:

```python
import time

# Inside check_and_set_dedup():
ttl_value = int(time.time()) + 86400  # 24 hours from now

await table.put_item(
    Item={"pk": pk, "phone_hash": phone_hash, "scheme_id": scheme_id, "ttl": ttl_value},
    ConditionExpression="attribute_not_exists(pk)",
)
```

#### Fix 2: Update `updated_at` on upsert

In `stream-processing-service/app/workers.py`, add to the `ON CONFLICT` clause:
```sql
DO UPDATE SET
    total_count  = EXCLUDED.total_count,
    response_sum = EXCLUDED.response_sum,
    no_pct       = EXCLUDED.no_pct,
    z_score      = EXCLUDED.z_score,
    updated_at   = now()
```

#### Fix 3: Change default region to `us-east-1`

In both `config.py` files:
```python
aws_region: str = "us-east-1"  # was "ap-south-1"
```

#### Fix 4: Fix the broken string literal

In `ingestion-service/app/aws_clients.py`, change:
```python
kwargs: dict = {"r"
"egion_name": s.aws_region}
```
to:
```python
kwargs: dict = {"region_name": s.aws_region}
```

#### Fix 5: Add `.gitignore`

Create a root `.gitignore`:
```
.env
__pycache__/
*.pyc
venv/
.venv/
```

#### Fix 6: Remove unused `scipy` dependency

Remove `scipy==1.13.0` from `stream-processing-service/requirements.txt` (it's never imported).

---

### 2.8 What to Build Next: Anomaly Detection Service

The README describes an Anomaly Detection Service (port 8002) that doesn't exist yet. Here's the specification based on the README and database schema:

**Endpoints needed:**
- `GET /health` — health check
- `POST /api/anomaly/analyse` — trigger analysis (body: optional `report_date`, `z_score_threshold`)
- `GET /api/anomaly/reports?limit=20` — list recent reports

**Required environment variables:**
- `OPENAI_API_KEY` — OpenAI API key
- `OPENAI_MODEL` — model name (default `gpt-4o`)
- `Z_SCORE_THRESHOLD` — threshold (default 2.0)
- `ANALYSIS_INTERVAL_SECONDS` — background interval (default 21600 = 6h)
- `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`

**Logic:**
1. Query `daily_responses` for a given `report_date`
2. Filter rows where `|z_score| >= Z_SCORE_THRESHOLD`
3. Send flagged rows + summary statistics to OpenAI for natural language analysis
4. Store the report in `anomaly_reports` table (columns: `report_date`, `flagged_count`, `ai_summary`)
5. Background scheduler runs every `ANALYSIS_INTERVAL_SECONDS`

---

### 2.9 Startup Order & Dependencies

Services must be started in this order:

```
1. AWS Resources (RDS, DynamoDB, Kinesis) — must exist first
2. SQL migration (sql/init.sql) — tables must be created
3. Seed data (beneficiaries) — at least one entry for testing
4. Ingestion Service (port 8000) — can now accept webhooks
5. Stream Processing Service (port 8001) — begins consuming Kinesis
6. (Future) Anomaly Detection Service (port 8002) — reads from RDS
```

**Critical dependency chain:**
- Stream Processing Service **must** be running before (or shortly after) Ingestion Service starts producing records, because it uses `LATEST` shard iterators — records produced before the consumer starts are **lost**.
- If you need to process historical records, change `ShardIteratorType` from `"LATEST"` to `"TRIM_HORIZON"` in `stream-processing-service/app/aws_clients.py`.

---

### 2.10 Monitoring & Debugging Checklist

| Check | How |
|---|---|
| Ingestion Service is up | `curl http://localhost:8000/health` |
| Stream Processing is up | `curl http://localhost:8001/health` |
| Webhook accepts data | POST to `/api/ivr/webhook` with valid payload |
| Kinesis receiving records | AWS Console → Kinesis → ivr-responses-stream → Monitoring tab |
| DynamoDB dedup working | AWS Console → DynamoDB → response_dedup → Explore items |
| DynamoDB counters incrementing | AWS Console → DynamoDB → responses_dynamo_ref → Explore items |
| RDS daily_responses populated | `SELECT * FROM daily_responses WHERE report_date = CURRENT_DATE;` |
| Flush working | `curl -X POST http://localhost:8001/admin/flush` |
| Check service logs | Look at terminal/container stdout for `INFO` and `ERROR` messages |

---

### 2.11 Common Errors & Solutions

| Error | Cause | Fix |
|---|---|---|
| `ResourceNotFoundException` | Wrong AWS region or resource doesn't exist | Set `AWS_REGION=us-east-1` in `.env`; verify resource names in AWS Console |
| `ExpiredTokenException` | Learner Lab session expired | Copy fresh credentials from Learner Lab → AWS Details |
| `UnrecognizedClientException` | Missing `AWS_SESSION_TOKEN` | Add `AWS_SESSION_TOKEN` to `.env` |
| `Connection refused` on port 5432 | RDS security group blocking | Add inbound rule for your IP on port 5432 |
| `relation "beneficiaries" does not exist` | SQL migration not run | Execute `psql -h <host> -U anveshak_admin -d anveshak -f sql/init.sql` |
| `403 Unknown beneficiary` | Phone hash not in beneficiaries table | Insert test beneficiary: `INSERT INTO beneficiaries (phone_hash, name, pincode) VALUES ('abc123hash', 'Test Citizen 1', '560001');` |
| Webhook returns 422 | Invalid payload format | Ensure `pincode` is exactly 6 digits, `response_value` is 1-5, all fields present |
| No data in `daily_responses` | Flush hasn't run yet | Call `POST /admin/flush` or wait for the hourly window |
| Records missing from stream processing | Consumer started after records were published | Consumer uses LATEST—restart consumer, then re-send records |
