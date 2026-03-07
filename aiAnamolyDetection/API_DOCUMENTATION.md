# WelfareWatch — AI Anomaly Engine API Documentation

> **Base URL:** `http://localhost:3000` (dev) / `https://your-domain.com` (prod)
>
> **Version:** 1.0.0 &nbsp;|&nbsp; **Protocol:** HTTP/HTTPS &nbsp;|&nbsp; **Content-Type:** `application/json`

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Authentication](#2-authentication)
3. [Common Response Format](#3-common-response-format)
4. [Error Handling](#4-error-handling)
5. [CORS Configuration](#5-cors-configuration)
6. [Rate Limiting](#6-rate-limiting)
7. [Endpoints](#7-endpoints)
   - [GET /health](#71-health-check)
   - [POST /api/anomaly/classify](#72-classify-single-anomaly)
   - [POST /api/anomaly/classify/batch](#73-classify-batch)
   - [POST /api/anomaly/classify/pending](#74-classify-pending-from-db)
   - [GET /api/anomaly/:id/result](#75-get-anomaly-result)
   - [GET /api/anomaly/stats](#76-get-processing-stats)
8. [Data Types & Enums](#8-data-types--enums)
9. [Frontend Integration Guide](#9-frontend-integration-guide)
10. [TypeScript Interfaces](#10-typescript-interfaces)

---

## 1. Quick Start

```bash
# Health check (no auth)
curl http://localhost:3000/health

# Get processing stats
curl http://localhost:3000/api/anomaly/stats \
  -H "X-Engine-Secret: YOUR_SECRET"

# Classify a single anomaly
curl -X POST http://localhost:3000/api/anomaly/classify \
  -H "Content-Type: application/json" \
  -H "X-Engine-Secret: YOUR_SECRET" \
  -d '{ "id": "uuid-here", "date": "2026-03-07", ... }'
```

---

## 2. Authentication

All `/api/anomaly/*` endpoints require the **`X-Engine-Secret`** header.

| Header            | Value                                       | Required                              |
| ----------------- | ------------------------------------------- | ------------------------------------- |
| `X-Engine-Secret` | Server-configured secret string             | **Yes** (all `/api/anomaly/*` routes) |
| `Content-Type`    | `application/json`                          | **Yes** (POST routes)                 |
| `X-Request-ID`    | UUID (optional — auto-generated if missing) | No                                    |

### Frontend implementation

```javascript
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const ENGINE_SECRET = import.meta.env.VITE_ENGINE_SECRET;

const headers = {
  "Content-Type": "application/json",
  "X-Engine-Secret": ENGINE_SECRET,
};
```

### Error responses

| Status | Meaning        | Response Body                                                     |
| ------ | -------------- | ----------------------------------------------------------------- |
| `401`  | Header missing | `{ "success": false, "error": "Missing X-Engine-Secret header" }` |
| `403`  | Wrong secret   | `{ "success": false, "error": "Invalid engine secret" }`          |

---

## 3. Common Response Format

**Every** response from this API follows this envelope:

```json
{
  "success": true | false,
  "error": "...",          // present only when success=false
  "data": { ... },         // present on single-record queries
  "results": [ ... ],      // present on batch/list queries
  "summary": { ... },      // present on batch operations
  "meta": { ... }          // present on classify responses (OpenAI usage)
}
```

### Response Headers (all endpoints)

| Header                  | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `X-Request-ID`          | Unique request trace ID — send this with bug reports |
| `X-RateLimit-Remaining` | Requests remaining in current window                 |
| `Content-Encoding`      | `gzip` (responses are compressed)                    |

---

## 4. Error Handling

### Standard error codes

| HTTP Status | Meaning                    | Frontend Action                      |
| ----------- | -------------------------- | ------------------------------------ |
| `400`       | Validation failed          | Show `details[]` array to user       |
| `401`       | Missing auth header        | Redirect to config / show auth error |
| `403`       | Wrong secret               | Show "access denied"                 |
| `404`       | Resource not found         | Show "not found" message             |
| `429`       | Rate limit hit             | Retry after `Retry-After` header     |
| `500`       | Server / OpenAI / DB error | Show generic error, retry once       |
| `503`       | Database unreachable       | Show "service unavailable"           |

### 400 Validation Error shape

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "\"date\" is required",
    "\"severity\" must be one of [CRITICAL, HIGH, MEDIUM, LOW]",
    "pincode is required when level is PINCODE"
  ]
}
```

### Recommended frontend error handler

```javascript
async function apiCall(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || "Unknown error");
    error.status = res.status;
    error.details = data.details || [];
    error.requestId = res.headers.get("X-Request-ID");
    throw error;
  }

  return data;
}
```

---

## 5. CORS Configuration

The server accepts cross-origin requests from configured origins.

| Frontend Dev Server            | Allowed by Default                      |
| ------------------------------ | --------------------------------------- |
| `http://localhost:3000`        | ✅                                      |
| `http://localhost:5173` (Vite) | ✅                                      |
| Production domain              | Must be added to `CORS_ORIGINS` env var |

**Allowed methods:** `GET`, `POST`, `OPTIONS`

**Allowed headers:** `Content-Type`, `X-Engine-Secret`, `X-Request-ID`

If you see CORS errors, ensure your frontend domain is in the server's `CORS_ORIGINS` env var (comma-separated).

---

## 6. Rate Limiting

| Config                  | Default    |
| ----------------------- | ---------- |
| Window                  | 60 seconds |
| Max requests per window | 60         |

When exceeded, you receive:

```json
// HTTP 429
{ "success": false, "error": "Too many requests — slow down" }
```

Use exponential backoff or respect the `Retry-After` header.

---

## 7. Endpoints

---

### 7.1 Health Check

Check if the service and its dependencies are alive. **No authentication required.**

```
GET /health
```

#### Response — 200 OK

```json
{
  "status": "healthy",
  "timestamp": "2026-03-07T09:00:00.000Z",
  "services": {
    "database": "ok",
    "openai": "configured"
  }
}
```

#### Response — 503 Service Unavailable

```json
{
  "status": "degraded",
  "timestamp": "2026-03-07T09:00:00.000Z",
  "services": {
    "database": "error",
    "openai": "configured"
  }
}
```

#### Frontend usage

```javascript
async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  const data = await res.json();
  return data.status === "healthy";
}
```

---

### 7.2 Classify Single Anomaly

Send one anomaly record to OpenAI for AI classification. The engine:

1. Upserts the record in `anomaly_records` (creates if missing)
2. Calls OpenAI gpt-4o-mini for classification
3. Writes the AI result back to the database
4. Logs the prompt in `ai_prompt_log`

```
POST /api/anomaly/classify
```

#### Request Headers

| Header            | Value              |
| ----------------- | ------------------ |
| `Content-Type`    | `application/json` |
| `X-Engine-Secret` | `<your secret>`    |

#### Request Body

```json
{
  "id": "bbbbbbbb-0000-0000-0000-000000000001",
  "date": "2026-03-07",
  "detector_type": "NO_SPIKE",
  "level": "PINCODE",
  "pincode": "605001",
  "block": "Vikravandi",
  "district": "Villupuram",
  "state": "Tamil Nadu",
  "scheme_id": "PDS",
  "severity": "CRITICAL",
  "score": 4.8,
  "no_pct": 0.81,
  "baseline_no_pct": 0.29,
  "total_responses": 158,
  "affected_beneficiaries": 210,
  "raw_data": {
    "z_score": 4.8,
    "today_no_pct": 0.81,
    "baseline_no_pct": 0.29,
    "std_dev": 0.109,
    "window": "2026-03-07#14"
  }
}
```

#### Field Reference

| Field                    | Type        | Required    | Validation Rules                                                          |
| ------------------------ | ----------- | ----------- | ------------------------------------------------------------------------- |
| `id`                     | UUID string | ✅          | Must be valid UUIDv4                                                      |
| `date`                   | string      | ✅          | ISO date `YYYY-MM-DD`                                                     |
| `detector_type`          | string      | ✅          | One of: `NO_SPIKE`, `SILENCE`, `DUPLICATE_BENEFICIARY`, `DISTRICT_ROLLUP` |
| `level`                  | string      | ✅          | One of: `PINCODE`, `BLOCK`, `DISTRICT`                                    |
| `pincode`                | string      | Conditional | **Required if `level` = `PINCODE`**. Must be 6 digits.                    |
| `block`                  | string      | Conditional | **Required if `level` = `PINCODE` or `BLOCK`**. Max 80 chars.             |
| `district`               | string      | ✅          | Max 80 chars                                                              |
| `state`                  | string      | No          | Max 50 chars                                                              |
| `scheme_id`              | string      | ✅          | One of: `PDS`, `PM_KISAN`, `OLD_AGE_PENSION`, `LPG`                       |
| `severity`               | string      | ✅          | One of: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`                               |
| `score`                  | number      | ✅          | z-score, ratio, or count depending on detector                            |
| `no_pct`                 | number      | No          | `0.0` – `1.0` (null for DUPLICATE_BENEFICIARY)                            |
| `baseline_no_pct`        | number      | No          | `0.0` – `1.0` (null for DUPLICATE_BENEFICIARY)                            |
| `total_responses`        | integer     | ✅          | `>= 0`                                                                    |
| `affected_beneficiaries` | integer     | ✅          | `>= 0`                                                                    |
| `raw_data`               | object      | ✅          | Free-form object — full detector output                                   |

#### Response — 200 OK

```json
{
  "success": true,
  "anomaly_id": "bbbbbbbb-0000-0000-0000-000000000001",
  "result": {
    "ai_classification": "SUPPLY_FAILURE",
    "ai_confidence": 0.91,
    "ai_reasoning": "NO% spiked to 81% vs 7-day baseline of 29% — z-score 4.8 indicates a non-random event. Pattern consistent with FPS distribution point not opening.",
    "ai_action": "Conduct immediate field visit to FPS store at 605001. Verify stock availability and dealer attendance.",
    "ai_action_ta": "605001 இல் உள்ள FPS கடைக்கு உடனடி கள வருகை மேற்கொள்ளவும். பங்கு கிடைக்கும் தன்மையை சரிபார்க்கவும்.",
    "ai_urgency": "TODAY",
    "signals_used": [
      "z_score_4.8",
      "no_pct_0.81",
      "distribution_window_active"
    ],
    "confidence_adjustments": [
      { "factor": "high_sample_size", "delta": 0.05 },
      { "factor": "score_exceeds_2x_threshold", "delta": 0.05 }
    ]
  },
  "meta": {
    "model": "gpt-4o-mini",
    "total_tokens": 1015,
    "latency_ms": 1842,
    "cost_usd": 0.00024
  }
}
```

#### Response — 400 Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "\"date\" is required",
    "pincode is required when level is PINCODE"
  ]
}
```

#### Response — 500 Server Error

```json
{
  "success": false,
  "anomaly_id": "bbbbbbbb-0000-0000-0000-000000000001",
  "error": "OpenAI API error: insufficient_quota"
}
```

#### Frontend usage

```javascript
async function classifyAnomaly(anomaly) {
  return apiCall("/api/anomaly/classify", {
    method: "POST",
    body: JSON.stringify(anomaly),
  });
}

// Usage
const result = await classifyAnomaly({
  id: crypto.randomUUID(),
  date: "2026-03-07",
  detector_type: "NO_SPIKE",
  level: "PINCODE",
  pincode: "605001",
  block: "Vikravandi",
  district: "Villupuram",
  state: "Tamil Nadu",
  scheme_id: "PDS",
  severity: "CRITICAL",
  score: 4.8,
  no_pct: 0.81,
  baseline_no_pct: 0.29,
  total_responses: 158,
  affected_beneficiaries: 210,
  raw_data: { z_score: 4.8 },
});

console.log(result.result.ai_classification); // "SUPPLY_FAILURE"
console.log(result.result.ai_urgency); // "TODAY"
```

---

### 7.3 Classify Batch

Send multiple anomaly records for classification in one request. Records are processed **sequentially** (200 ms delay between OpenAI calls).

```
POST /api/anomaly/classify/batch
```

#### Request Body

```json
{
  "anomalies": [
    {
      /* anomaly object 1 — same schema as /classify */
    },
    {
      /* anomaly object 2 */
    }
  ]
}
```

#### Limits

| Constraint          | Value                                 |
| ------------------- | ------------------------------------- |
| Min items           | 1                                     |
| Max items           | `BATCH_SIZE` env var (default: **5**) |
| Processing order    | Sequential                            |
| Delay between calls | 200 ms                                |

#### Response — 200 OK

```json
{
  "success": true,
  "summary": {
    "total": 2,
    "succeeded": 2,
    "failed": 0
  },
  "results": [
    {
      "success": true,
      "anomaly_id": "...",
      "result": {
        "ai_classification": "SUPPLY_FAILURE",
        "ai_confidence": 0.78,
        "...": "..."
      },
      "meta": {
        "model": "gpt-4o-mini",
        "total_tokens": 980,
        "latency_ms": 1640,
        "cost_usd": 0.00022
      }
    },
    {
      "success": true,
      "anomaly_id": "...",
      "result": {
        "ai_classification": "DATA_ARTIFACT",
        "ai_confidence": 0.61,
        "...": "..."
      },
      "meta": { "...": "..." }
    }
  ]
}
```

> **Note:** Even if some items fail, the overall HTTP status is still `200`. Check each item's `success` flag and the `summary.failed` count.

#### Frontend usage

```javascript
async function classifyBatch(anomalies) {
  return apiCall("/api/anomaly/classify/batch", {
    method: "POST",
    body: JSON.stringify({ anomalies }),
  });
}

const { summary, results } = await classifyBatch([anomaly1, anomaly2]);
if (summary.failed > 0) {
  const failures = results.filter((r) => !r.success);
  console.warn("Some classifications failed:", failures);
}
```

---

### 7.4 Classify Pending (from DB)

Pulls all anomaly records where `ai_classification IS NULL OR = 'PENDING'` from the database, ordered by severity (CRITICAL first), and classifies them.

This is the **primary automated pipeline trigger** — call it on a schedule (e.g., every 5 minutes via cron or the dashboard).

```
POST /api/anomaly/classify/pending?limit=5
```

#### Query Parameters

| Param   | Type    | Default              | Description                     |
| ------- | ------- | -------------------- | ------------------------------- |
| `limit` | integer | `BATCH_SIZE` env (5) | Max records to pull and process |

#### Request Body

None required.

#### Response — 200 OK (records found)

```json
{
  "success": true,
  "summary": { "total": 3, "succeeded": 3, "failed": 0 },
  "results": ["..."]
}
```

#### Response — 200 OK (no pending records)

```json
{
  "success": true,
  "message": "No pending anomalies found",
  "summary": { "total": 0, "succeeded": 0, "failed": 0 },
  "results": []
}
```

#### Frontend usage

```javascript
async function classifyPending(limit = 5) {
  return apiCall(`/api/anomaly/classify/pending?limit=${limit}`, {
    method: "POST",
  });
}

// Trigger from dashboard "Process Pending" button
const { summary } = await classifyPending(10);
showToast(`Processed ${summary.succeeded}/${summary.total} anomalies`);
```

---

### 7.5 Get Anomaly Result

Fetch the AI classification result for a single anomaly by UUID.

```
GET /api/anomaly/:id/result
```

#### Path Parameters

| Param | Type | Description       |
| ----- | ---- | ----------------- |
| `id`  | UUID | Anomaly record ID |

#### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "date": "2024-11-19",
    "detector_type": "NO_SPIKE",
    "scheme_id": "PDS",
    "severity": "CRITICAL",
    "ai_classification": "SUPPLY_FAILURE",
    "ai_confidence": "0.910",
    "ai_reasoning": "NO% spiked to 78% vs 7-day baseline of 31%...",
    "ai_action": "Conduct immediate field visit to FPS store at 605001.",
    "ai_action_ta": "605001 இல் உள்ள FPS கடைக்கு உடனடி கள வருகை மேற்கொள்ளவும்.",
    "ai_urgency": "TODAY",
    "ai_processed_at": "2024-11-19T08:59:50.000Z",
    "status": "ASSIGNED"
  }
}
```

#### Response — 404 Not Found

```json
{
  "success": false,
  "error": "Anomaly not found"
}
```

#### Frontend usage

```javascript
async function getAnomalyResult(id) {
  return apiCall(`/api/anomaly/${id}/result`);
}

const { data } = await getAnomalyResult("aaaaaaaa-0000-0000-0000-000000000001");

// Render classification badge
renderBadge(data.ai_classification); // "SUPPLY_FAILURE"
renderUrgency(data.ai_urgency); // "TODAY"
renderAction(data.ai_action);
renderActionTamil(data.ai_action_ta);
```

---

### 7.6 Get Processing Stats

Returns a 7-day summary of anomaly classification counts and OpenAI API usage metrics.

```
GET /api/anomaly/stats
```

#### Response — 200 OK

```json
{
  "success": true,
  "window": "last_7_days",
  "anomalies": {
    "total_anomalies": "3",
    "classified": "3",
    "pending": "0",
    "supply_failure": "2",
    "demand_collapse": "0",
    "fraud_pattern": "0",
    "data_artifact": "1",
    "avg_confidence": "0.767"
  },
  "openai_usage": {
    "total_cost_usd": "0.000709",
    "total_tokens": "3025",
    "total_calls": "3",
    "successful_calls": "3",
    "avg_latency_ms": "1866"
  }
}
```

> **Note:** All values in `anomalies` and `openai_usage` come from PostgreSQL as strings. Parse numerics on the frontend.

#### Frontend usage

```javascript
async function getStats() {
  return apiCall("/api/anomaly/stats");
}

const { anomalies, openai_usage } = await getStats();

// Dashboard cards
const classified = parseInt(anomalies.classified);
const pending = parseInt(anomalies.pending);
const totalCost = parseFloat(openai_usage.total_cost_usd);
const avgLatency = parseInt(openai_usage.avg_latency_ms);
```

---

## 8. Data Types & Enums

### Detector Types

| Value                   | Description                                  | Key score field           |
| ----------------------- | -------------------------------------------- | ------------------------- |
| `NO_SPIKE`              | NO% z-score exceeds threshold                | `score` = z-score         |
| `SILENCE`               | Too few responses vs expected                | `score` = silence_ratio   |
| `DUPLICATE_BENEFICIARY` | Same phone responded >2x/day                 | `score` = duplicate_count |
| `DISTRICT_ROLLUP`       | ≥3 blocks in district exceeded NO% threshold | `score` = district NO%    |

### Severity Levels

| Value      | Threshold (NO_SPIKE z-score) | Color suggestion |
| ---------- | ---------------------------- | ---------------- |
| `CRITICAL` | ≥ 3.0                        | 🔴 Red           |
| `HIGH`     | ≥ 2.0                        | 🟠 Orange        |
| `MEDIUM`   | ≥ 1.5                        | 🟡 Yellow        |
| `LOW`      | < 1.5                        | 🟢 Green         |

### AI Classifications

| Value             | Meaning                                                    |
| ----------------- | ---------------------------------------------------------- |
| `SUPPLY_FAILURE`  | Benefit not delivered — supply-side issue                  |
| `DEMAND_COLLAPSE` | Beneficiaries stopped claiming — not a delivery failure    |
| `FRAUD_PATTERN`   | Statistical signature consistent with fabricated responses |
| `DATA_ARTIFACT`   | Technical/data issue — not a real welfare failure          |
| `PENDING`         | Insufficient data to classify (confidence < 0.50)          |

### AI Urgency

| Value       | Meaning                         | SLA suggestion      |
| ----------- | ------------------------------- | ------------------- |
| `TODAY`     | Requires same-day action        | < 8 hours           |
| `THIS_WEEK` | Requires action within the week | < 72 hours          |
| `MONITOR`   | Track in next survey window     | No immediate action |

### Schemes

| ID                | Full Name                  |
| ----------------- | -------------------------- |
| `PDS`             | Public Distribution System |
| `PM_KISAN`        | PM Kisan Samman Nidhi      |
| `OLD_AGE_PENSION` | Old Age Pension            |
| `LPG`             | LPG Subsidy (PAHAL/DBTL)   |

### Geography Levels

| Value      | Required fields                         |
| ---------- | --------------------------------------- |
| `PINCODE`  | `pincode` ✅, `block` ✅, `district` ✅ |
| `BLOCK`    | `pincode` ❌, `block` ✅, `district` ✅ |
| `DISTRICT` | `pincode` ❌, `block` ❌, `district` ✅ |

### Anomaly Statuses (from DB)

| Status          | Meaning                           |
| --------------- | --------------------------------- |
| `NEW`           | Just detected — not yet reviewed  |
| `ASSIGNED`      | Assigned to a field officer       |
| `INVESTIGATING` | Officer is actively investigating |
| `FIELD_VISIT`   | Physical verification underway    |
| `RESOLVED`      | Issue resolved                    |
| `ESCALATED`     | Escalated to higher authority     |

---

## 9. Frontend Integration Guide

### Recommended API client setup (React / Vue / Svelte)

```javascript
// lib/api.js

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const ENGINE_SECRET = import.meta.env.VITE_ENGINE_SECRET;

const defaultHeaders = {
  "Content-Type": "application/json",
  "X-Engine-Secret": ENGINE_SECRET,
};

/**
 * Generic API caller with error handling.
 * Throws an error object with { status, message, details, requestId }.
 */
export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: defaultHeaders,
    ...options,
  });

  const body = await res.json();

  if (!res.ok || body.success === false) {
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.details = body.details || [];
    err.requestId = res.headers.get("X-Request-ID");
    throw err;
  }

  return body;
}

// ── Convenience wrappers ──

export const checkHealth = () =>
  fetch(`${API_BASE}/health`).then((r) => r.json());

export const classifyAnomaly = (anomaly) =>
  api("/api/anomaly/classify", {
    method: "POST",
    body: JSON.stringify(anomaly),
  });

export const classifyBatch = (anomalies) =>
  api("/api/anomaly/classify/batch", {
    method: "POST",
    body: JSON.stringify({ anomalies }),
  });

export const classifyPending = (limit = 5) =>
  api(`/api/anomaly/classify/pending?limit=${limit}`, { method: "POST" });

export const getAnomalyResult = (id) => api(`/api/anomaly/${id}/result`);

export const getStats = () => api("/api/anomaly/stats");
```

### Environment variables (`.env` or `.env.local`)

```env
VITE_API_BASE=http://localhost:3000
VITE_ENGINE_SECRET=your-engine-secret-here
```

### Polling for pending classification (dashboard)

```javascript
// Poll every 5 minutes to auto-classify new anomalies
useEffect(() => {
  const interval = setInterval(
    async () => {
      try {
        const { summary } = await classifyPending(10);
        if (summary.succeeded > 0) {
          refreshDashboard();
          showNotification(`Classified ${summary.succeeded} new anomalies`);
        }
      } catch (err) {
        console.error("Auto-classify failed:", err);
      }
    },
    5 * 60 * 1000,
  );

  return () => clearInterval(interval);
}, []);
```

### Displaying AI results

```jsx
function AnomalyCard({ anomalyId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAnomalyResult(anomalyId).then((res) => setData(res.data));
  }, [anomalyId]);

  if (!data) return <Spinner />;

  return (
    <div className="anomaly-card">
      <Badge type={data.ai_classification} />
      <UrgencyTag urgency={data.ai_urgency} />
      <p className="confidence">
        Confidence: {(data.ai_confidence * 100).toFixed(0)}%
      </p>
      <p className="reasoning">{data.ai_reasoning}</p>
      <div className="action-box">
        <p lang="en">{data.ai_action}</p>
        <p lang="ta">{data.ai_action_ta}</p>
      </div>
      <StatusBadge status={data.status} />
    </div>
  );
}
```

---

## 10. TypeScript Interfaces

Copy these into your frontend project for type safety.

```typescript
// types/anomaly.ts

// ── Enums ──

export type DetectorType =
  | "NO_SPIKE"
  | "SILENCE"
  | "DUPLICATE_BENEFICIARY"
  | "DISTRICT_ROLLUP";
export type GeoLevel = "PINCODE" | "BLOCK" | "DISTRICT";
export type SchemeId = "PDS" | "PM_KISAN" | "OLD_AGE_PENSION" | "LPG";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AIClassification =
  | "SUPPLY_FAILURE"
  | "DEMAND_COLLAPSE"
  | "FRAUD_PATTERN"
  | "DATA_ARTIFACT"
  | "PENDING";
export type AIUrgency = "TODAY" | "THIS_WEEK" | "MONITOR";
export type AnomalyStatus =
  | "NEW"
  | "ASSIGNED"
  | "INVESTIGATING"
  | "FIELD_VISIT"
  | "RESOLVED"
  | "ESCALATED";

// ── Request types ──

export interface AnomalyInput {
  id: string; // UUIDv4
  date: string; // YYYY-MM-DD
  detector_type: DetectorType;
  level: GeoLevel;
  pincode: string | null; // Required if level = PINCODE
  block: string | null; // Required if level = PINCODE | BLOCK
  district: string;
  state?: string | null;
  scheme_id: SchemeId;
  severity: Severity;
  score: number;
  no_pct: number | null; // 0.0–1.0
  baseline_no_pct: number | null; // 0.0–1.0
  total_responses: number;
  affected_beneficiaries: number;
  raw_data: Record<string, unknown>;
}

export interface BatchInput {
  anomalies: AnomalyInput[]; // 1–5 items (BATCH_SIZE)
}

// ── Response types ──

export interface ConfidenceAdjustment {
  factor: string;
  delta: number; // +0.05 or -0.10
}

export interface AIResult {
  ai_classification: AIClassification;
  ai_confidence: number; // 0.01–0.99
  ai_reasoning: string;
  ai_action: string; // English, max 40 words
  ai_action_ta: string; // Tamil, max 50 words
  ai_urgency: AIUrgency;
  signals_used: string[];
  confidence_adjustments: ConfidenceAdjustment[];
}

export interface ClassifyMeta {
  model: string;
  total_tokens: number;
  latency_ms: number;
  cost_usd: number;
}

export interface ClassifyResponse {
  success: true;
  anomaly_id: string;
  result: AIResult;
  meta: ClassifyMeta;
}

export interface ClassifyErrorResponse {
  success: false;
  anomaly_id: string;
  error: string;
}

export interface BatchSummary {
  total: number;
  succeeded: number;
  failed: number;
}

export interface BatchResponse {
  success: true;
  summary: BatchSummary;
  results: (ClassifyResponse | ClassifyErrorResponse)[];
}

export interface PendingResponse {
  success: true;
  message?: string; // "No pending anomalies found"
  summary: BatchSummary;
  results: (ClassifyResponse | ClassifyErrorResponse)[];
}

export interface AnomalyResultData {
  id: string;
  date: string;
  detector_type: DetectorType;
  scheme_id: SchemeId;
  severity: Severity;
  ai_classification: AIClassification | null;
  ai_confidence: string; // Numeric string from PG
  ai_reasoning: string | null;
  ai_action: string | null;
  ai_action_ta: string | null;
  ai_urgency: AIUrgency | null;
  ai_processed_at: string | null; // ISO timestamp
  status: AnomalyStatus;
}

export interface AnomalyResultResponse {
  success: true;
  data: AnomalyResultData;
}

export interface StatsAnomalies {
  total_anomalies: string;
  classified: string;
  pending: string;
  supply_failure: string;
  demand_collapse: string;
  fraud_pattern: string;
  data_artifact: string;
  avg_confidence: string | null;
}

export interface StatsOpenAI {
  total_cost_usd: string;
  total_tokens: string;
  total_calls: string;
  successful_calls: string;
  avg_latency_ms: string | null;
}

export interface StatsResponse {
  success: true;
  window: "last_7_days";
  anomalies: StatsAnomalies;
  openai_usage: StatsOpenAI;
}

export interface HealthResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  services: {
    database: "ok" | "error";
    openai: "configured" | "missing";
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string[];
}
```

---

## Endpoint Summary (Quick Reference)

| Method | Path                            | Auth | Description                          |
| ------ | ------------------------------- | ---- | ------------------------------------ |
| `GET`  | `/health`                       | ❌   | Service health check                 |
| `POST` | `/api/anomaly/classify`         | ✅   | Classify single anomaly via OpenAI   |
| `POST` | `/api/anomaly/classify/batch`   | ✅   | Classify 1–5 anomalies in one call   |
| `POST` | `/api/anomaly/classify/pending` | ✅   | Auto-classify all pending DB records |
| `GET`  | `/api/anomaly/:id/result`       | ✅   | Fetch AI result for one anomaly      |
| `GET`  | `/api/anomaly/stats`            | ✅   | 7-day classification & cost stats    |

---

_Generated for WelfareWatch AI Anomaly Engine v1.0.0_
