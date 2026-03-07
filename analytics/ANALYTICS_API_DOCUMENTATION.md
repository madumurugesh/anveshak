# WelfareWatch Analytics Engine — Frontend API Documentation

> **Base URL:** `http://localhost:3001`  
> **Version:** 1.0.0  
> **Auth:** All endpoints require `X-Engine-Secret` header

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Common Query Parameters](#2-common-query-parameters)
3. [Response Envelope](#3-response-envelope)
4. [Dashboard](#4-dashboard)
5. [Anomalies](#5-anomalies)
6. [Reports](#6-reports)
7. [Officers](#7-officers)
8. [Beneficiaries](#8-beneficiaries)
9. [Schemes](#9-schemes)
10. [Responses](#10-responses)
11. [AI Usage & Performance](#11-ai-usage--performance)
12. [Health Check](#12-health-check)
13. [Error Handling](#13-error-handling)
14. [TypeScript Interfaces](#14-typescript-interfaces)
15. [Frontend Integration Guide](#15-frontend-integration-guide)

---

## 1. Authentication

Every request must include:

```
X-Engine-Secret: <your-engine-secret>
```

| Status | Meaning                   |
| ------ | ------------------------- |
| `401`  | Header missing            |
| `403`  | Secret value is incorrect |

---

## 2. Common Query Parameters

Most `GET` endpoints accept these query parameters:

### Date Range

| Param        | Type   | Default | Description                              |
| ------------ | ------ | ------- | ---------------------------------------- |
| `days`       | number | `7`     | Look-back window (1–365)                 |
| `start_date` | string | —       | ISO date `YYYY-MM-DD` (overrides `days`) |
| `end_date`   | string | —       | ISO date `YYYY-MM-DD` (overrides `days`) |

> If both `start_date` and `end_date` are provided, they take priority over `days`.

### Pagination

| Param   | Type   | Default | Description              |
| ------- | ------ | ------- | ------------------------ |
| `page`  | number | `1`     | Page number (1-based)    |
| `limit` | number | `20`    | Items per page (max 100) |

### Filters

| Param               | Type   | Values                                                                           |
| ------------------- | ------ | -------------------------------------------------------------------------------- |
| `district`          | string | Any district name                                                                |
| `block`             | string | Any block name                                                                   |
| `state`             | string | Any state name                                                                   |
| `scheme_id`         | string | `PDS`, `PM_KISAN`, `OLD_AGE_PENSION`, `LPG`                                      |
| `severity`          | string | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`                                              |
| `status`            | string | `NEW`, `ASSIGNED`, `INVESTIGATING`, `FIELD_VISIT`, `RESOLVED`, `ESCALATED`       |
| `ai_classification` | string | `SUPPLY_FAILURE`, `DEMAND_COLLAPSE`, `FRAUD_PATTERN`, `DATA_ARTIFACT`, `PENDING` |
| `detector_type`     | string | `NO_SPIKE`, `SILENCE`, `DUPLICATE_BENEFICIARY`, `DISTRICT_ROLLUP`                |
| `level`             | string | `PINCODE`, `BLOCK`, `DISTRICT`                                                   |

---

## 3. Response Envelope

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "pagination": {             // only on paginated endpoints
    "page": 1,
    "limit": 20,
    "total": 142,
    "total_pages": 8
  },
  "window": "last_7_days"     // on time-windowed endpoints
}
```

---

## 4. Dashboard

### `GET /api/analytics/dashboard/overview`

Main dashboard cards — key metrics across all domains.

**Query:** `days`, `start_date`, `end_date`

**Response:**

```json
{
  "success": true,
  "window": "last_7_days",
  "data": {
    "responses": {
      "total_responses": "4320",
      "total_yes": "2680",
      "total_no": "1640",
      "districts_reporting": "2",
      "pincodes_reporting": "12",
      "avg_no_pct": "0.3796",
      "avg_response_rate": "0.7200"
    },
    "anomalies": {
      "total_anomalies": "3",
      "critical": "1",
      "high": "2",
      "medium": "0",
      "low": "0",
      "resolved": "0",
      "open": "3",
      "ai_classified": "3",
      "avg_ai_confidence": "0.767"
    },
    "beneficiaries": {
      "total_beneficiaries": "40",
      "active_beneficiaries": "36",
      "schemes_count": "4",
      "districts_count": "2"
    },
    "alerts": {
      "total_actions": "3",
      "resolved_actions": "0",
      "field_visits": "1",
      "escalations": "1"
    }
  }
}
```

---

### `GET /api/analytics/dashboard/trends`

Time-series data for charts showing response volume and anomaly counts per day.

**Query:** `days`, `start_date`, `end_date`, `scheme_id`, `district`

**Response:**

```json
{
  "success": true,
  "window": "last_7_days",
  "data": {
    "response_trend": [
      {
        "date": "2024-11-18",
        "total_responses": "1840",
        "yes_count": "1086",
        "no_count": "754",
        "avg_no_pct": "0.4100"
      }
    ],
    "anomaly_trend": [
      {
        "date": "2024-11-18",
        "total_anomalies": "1",
        "critical": "0",
        "high": "1",
        "medium": "0",
        "low": "0"
      }
    ]
  }
}
```

---

### `GET /api/analytics/dashboard/district-summary`

Per-district breakdown for map visualisation or summary table.

**Query:** `days`, `start_date`, `end_date`, `scheme_id`

**Response:**

```json
{
  "success": true,
  "window": "last_7_days",
  "count": 2,
  "data": [
    {
      "district": "Villupuram",
      "total_responses": "4320",
      "yes_count": "2680",
      "no_count": "1640",
      "avg_no_pct": "0.3796",
      "avg_response_rate": "0.7200",
      "pincodes": "6",
      "anomaly_count": "2",
      "critical_count": "1"
    }
  ]
}
```

---

## 5. Anomalies

### `GET /api/analytics/anomalies`

Paginated anomaly list with full filter support. Sorted by severity (CRITICAL first), then date desc.

**Query:** All common params (date, pagination, filters)

**Response:**

```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 20, "total": 3, "total_pages": 1 },
  "data": [
    {
      "id": "aaaaaaaa-0000-0000-0000-000000000001",
      "date": "2024-11-19",
      "detector_type": "NO_SPIKE",
      "level": "PINCODE",
      "pincode": "605001",
      "block": "Vikravandi",
      "district": "Villupuram",
      "state": "Tamil Nadu",
      "scheme_id": "PDS",
      "severity": "CRITICAL",
      "score": "4.2000",
      "no_pct": "0.7800",
      "baseline_no_pct": "0.3100",
      "total_responses": 142,
      "affected_beneficiaries": 210,
      "ai_classification": "SUPPLY_FAILURE",
      "ai_confidence": "0.910",
      "ai_reasoning": "NO% spiked to 78%...",
      "ai_action": "Conduct immediate field visit...",
      "ai_urgency": "TODAY",
      "ai_processed_at": "2024-11-19T09:00:00.000Z",
      "status": "ASSIGNED",
      "assigned_officer_id": "11111111-0000-0000-0000-000000000006",
      "assigned_officer_name": "Suresh Kumar",
      "assigned_officer_role": "BLOCK_OFFICER",
      "assigned_at": "2024-11-19T09:01:00.000Z",
      "resolved_at": null,
      "created_at": "2024-11-19T09:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/analytics/anomalies/summary`

Aggregated counts grouped by severity, classification, status, and detector type.

**Query:** `days`, `start_date`, `end_date`, `district`, `scheme_id`

**Response:**

```json
{
  "success": true,
  "data": {
    "by_severity": [
      { "severity": "HIGH", "count": "2" },
      { "severity": "CRITICAL", "count": "1" }
    ],
    "by_classification": [
      { "classification": "SUPPLY_FAILURE", "count": "2" },
      { "classification": "DATA_ARTIFACT", "count": "1" }
    ],
    "by_status": [
      { "status": "ASSIGNED", "count": "1" },
      { "status": "INVESTIGATING", "count": "1" },
      { "status": "ESCALATED", "count": "1" }
    ],
    "by_detector_type": [
      { "detector_type": "NO_SPIKE", "count": "1" },
      { "detector_type": "SILENCE", "count": "1" },
      { "detector_type": "DISTRICT_ROLLUP", "count": "1" }
    ]
  }
}
```

---

### `GET /api/analytics/anomalies/heatmap`

District × scheme matrix with anomaly counts for map/heatmap visualisation.

**Query:** `days`, `start_date`, `end_date`

**Response:**

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "district": "Villupuram",
      "scheme_id": "PDS",
      "anomaly_count": "1",
      "critical": "1",
      "high": "0",
      "avg_score": "4.20",
      "avg_no_pct": "0.7800"
    }
  ]
}
```

---

### `GET /api/analytics/anomalies/:id`

Full anomaly detail including action timeline and AI prompt history.

**Params:** `id` — UUID of the anomaly record

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "date": "2024-11-19",
    "detector_type": "NO_SPIKE",
    "severity": "CRITICAL",
    "ai_classification": "SUPPLY_FAILURE",
    "ai_confidence": "0.910",
    "ai_reasoning": "...",
    "ai_action": "...",
    "ai_action_ta": "...",
    "raw_data": { "z_score": 4.2, "...": "..." },
    "assigned_officer_name": "Suresh Kumar",
    "assigned_officer_email": "suresh.kumar@villupuram.gov.in",
    "actions": [
      {
        "id": "...",
        "action_type": "ASSIGNED",
        "notes": "Auto-assigned by system based on block jurisdiction.",
        "officer_name": "Suresh Kumar",
        "officer_role": "BLOCK_OFFICER",
        "created_at": "2024-11-19T09:01:00.000Z"
      },
      {
        "id": "...",
        "action_type": "FIELD_VISIT_STARTED",
        "notes": "Departing to FPS store at Vikravandi main market.",
        "created_at": "2024-11-19T10:15:00.000Z"
      }
    ],
    "ai_prompts": [
      {
        "id": "...",
        "model": "gpt-4o-mini",
        "prompt_tokens": 850,
        "completion_tokens": 320,
        "total_tokens": 1170,
        "cost_usd": "0.000400",
        "latency_ms": 1230,
        "success": true,
        "called_at": "2024-11-19T09:00:00.000Z"
      }
    ]
  }
}
```

---

## 6. Reports

### `GET /api/analytics/reports`

Paginated list of daily district reports.

**Query:** `days`, `start_date`, `end_date`, `district`, `page`, `limit`

**Response:**

```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 },
  "data": [
    {
      "id": "...",
      "district": "Villupuram",
      "report_date": "2024-11-19",
      "total_responses": 4320,
      "total_anomalies": 2,
      "critical_count": 1,
      "high_count": 1,
      "medium_count": 0,
      "schemes_summary": {
        "PDS": { "responses": 1420, "no_pct": 0.38, "anomalies": 1 },
        "PM_KISAN": { "responses": 1100, "no_pct": 0.41, "anomalies": 1 }
      },
      "best_performing_block": "Gingee",
      "worst_performing_pincode": "605001",
      "pdf_s3_key": "reports/2024-11/Villupuram_2024-11-19.pdf",
      "email_sent": true,
      "generated_at": "2024-11-19T17:15:00.000Z"
    }
  ]
}
```

---

### `GET /api/analytics/reports/:id`

Full report with narrative, related anomalies, and notification log.

**Params:** `id` — UUID of the report

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "district": "Villupuram",
    "report_date": "2024-11-19",
    "narrative_text": "Villupuram district recorded 4,320 total responses...",
    "pdf_s3_key": "reports/2024-11/Villupuram_2024-11-19.pdf",
    "schemes_summary": { "...": "..." },
    "anomalies": [
      {
        "id": "...",
        "severity": "CRITICAL",
        "scheme_id": "PDS",
        "status": "ASSIGNED"
      }
    ],
    "notifications": [
      {
        "channel": "EMAIL",
        "message_type": "DAILY_DIGEST",
        "delivered": true,
        "sent_at": "..."
      }
    ]
  }
}
```

---

### `GET /api/analytics/reports/:id/pdf`

Generate a presigned S3 URL to download the report PDF.

**Params:** `id` — UUID of the report

**Response:**

```json
{
  "success": true,
  "data": {
    "report_id": "...",
    "district": "Villupuram",
    "report_date": "2024-11-19",
    "download_url": "https://welfarewatch-reports.s3.ap-south-1.amazonaws.com/reports/2024-11/Villupuram_2024-11-19.pdf?X-Amz-...",
    "expires_in": 3600
  }
}
```

| Status | Meaning                              |
| ------ | ------------------------------------ |
| `200`  | Presigned URL generated              |
| `404`  | Report not found or no PDF available |

---

### `GET /api/analytics/reports/district/:district`

All reports for a specific district with pagination.

**Params:** `district` — District name  
**Query:** `days`, `start_date`, `end_date`, `page`, `limit`

---

## 7. Officers

### `GET /api/analytics/officers`

All officers with activity stats (total actions, field visits, resolutions, assigned anomalies).

**Query:** `district`, `state`

**Response:**

```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "id": "11111111-0000-0000-0000-000000000006",
      "name": "Suresh Kumar",
      "email": "suresh.kumar@villupuram.gov.in",
      "role": "BLOCK_OFFICER",
      "district": "Villupuram",
      "block": "Vikravandi",
      "is_active": true,
      "total_actions": "2",
      "field_visits": "1",
      "resolved_count": "0",
      "escalated_count": "0",
      "assigned_anomalies": "1",
      "open_anomalies": "1"
    }
  ]
}
```

---

### `GET /api/analytics/officers/:id`

Officer profile with recent actions, assigned anomalies, and session history.

---

### `GET /api/analytics/officers/:id/actions`

Paginated action timeline for a specific officer.

**Query:** `days` (default 30), `start_date`, `end_date`, `page`, `limit`

---

## 8. Beneficiaries

### `GET /api/analytics/beneficiaries/stats`

Aggregated beneficiary stats grouped by a chosen dimension.

**Query:** `group_by` (`district` | `scheme_id` | `block` | `state` | `gender`), `district`, `scheme_id`, `state`

**Response:**

```json
{
  "success": true,
  "group_by": "district",
  "count": 2,
  "data": [
    {
      "district": "Chengalpattu",
      "total": "20",
      "active": "18",
      "inactive": "2",
      "avg_age": "51.4",
      "male": "10",
      "female": "10",
      "other_gender": "0"
    }
  ]
}
```

---

### `GET /api/analytics/beneficiaries/distribution`

Demographics breakdown: age ranges, gender, scheme enrollment, language preference.

**Query:** `district`, `scheme_id`

**Response:**

```json
{
  "success": true,
  "data": {
    "by_age": [
      { "age_range": "30-44", "count": "8" },
      { "age_range": "45-59", "count": "12" }
    ],
    "by_gender": [
      { "gender": "Female", "count": "20" },
      { "gender": "Male", "count": "20" }
    ],
    "by_scheme": [
      { "scheme_id": "PDS", "count": "9" },
      { "scheme_id": "PM_KISAN", "count": "9" }
    ],
    "by_language": [
      { "language": "TA", "count": "35" },
      { "language": "HI", "count": "1" }
    ]
  }
}
```

---

### `GET /api/analytics/beneficiaries/coverage`

Response coverage: compares total responses against enrolled beneficiaries per district/scheme.

**Query:** `days`, `start_date`, `end_date`, `district`, `scheme_id`

---

## 9. Schemes

### `GET /api/analytics/schemes`

All schemes with current performance metrics (responses, anomalies, beneficiaries).

**Query:** `days`, `start_date`, `end_date`

**Response:**

```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "scheme_id": "PDS",
      "scheme_name_en": "Public Distribution System",
      "scheme_name_ta": "பொது விநியோக முறை",
      "is_active": true,
      "distribution_day_start": 1,
      "distribution_day_end": 5,
      "min_expected_response_rate": "0.300",
      "total_responses": "1420",
      "total_yes": "880",
      "total_no": "540",
      "avg_no_pct": "0.3800",
      "avg_response_rate": "0.6800",
      "reporting_districts": "2",
      "reporting_pincodes": "6",
      "anomaly_count": "1",
      "critical_anomalies": "1",
      "resolved_anomalies": "0",
      "total_beneficiaries": "10",
      "active_beneficiaries": "9"
    }
  ]
}
```

---

### `GET /api/analytics/schemes/:schemeId`

Single scheme detail with district breakdown, daily trends, and top anomalies.

**Params:** `schemeId` — `PDS`, `PM_KISAN`, `OLD_AGE_PENSION`, `LPG`  
**Query:** `days`, `start_date`, `end_date`

**Response:**

```json
{
  "success": true,
  "data": {
    "config": {
      "scheme_id": "PDS",
      "scheme_name_en": "Public Distribution System",
      "survey_question_en": "Did you receive your monthly ration this month?...",
      "distribution_day_start": 1,
      "distribution_day_end": 5
    },
    "district_breakdown": [
      {
        "district": "Villupuram",
        "total_responses": "1420",
        "avg_no_pct": "0.3800",
        "avg_response_rate": "0.6800",
        "pincodes": "3"
      }
    ],
    "daily_trends": [
      {
        "date": "2024-11-19",
        "total_responses": "1420",
        "no_count": "540",
        "avg_no_pct": "0.3800"
      }
    ],
    "top_anomalies": [
      {
        "id": "...",
        "severity": "CRITICAL",
        "ai_classification": "SUPPLY_FAILURE",
        "status": "ASSIGNED"
      }
    ]
  }
}
```

---

## 10. Responses

### `GET /api/analytics/responses/daily`

Paginated list of daily response aggregates per pincode/scheme.

**Query:** `days`, `start_date`, `end_date`, `district`, `block`, `scheme_id`, `page`, `limit`

---

### `GET /api/analytics/responses/trends`

Aggregated daily totals for time-series charts. Defaults to 30 days.

**Query:** `days` (default 30), `start_date`, `end_date`, `district`, `scheme_id`

**Response:**

```json
{
  "success": true,
  "count": 7,
  "data": [
    {
      "date": "2024-11-19",
      "total_responses": "4320",
      "yes_count": "2680",
      "no_count": "1640",
      "avg_no_pct": "0.3796",
      "avg_response_rate": "0.7200",
      "pincodes_reporting": "12",
      "districts_reporting": "2"
    }
  ]
}
```

---

### `GET /api/analytics/responses/rejections`

Rejected response analytics with reason breakdown and daily trend.

**Query:** `days`, `start_date`, `end_date`, `scheme_id`

**Response:**

```json
{
  "success": true,
  "data": {
    "total_rejections": 45,
    "by_reason": [
      { "rejection_reason": "DUPLICATE", "scheme_id": "PDS", "count": "18" },
      {
        "rejection_reason": "UNREGISTERED",
        "scheme_id": "PM_KISAN",
        "count": "12"
      }
    ],
    "daily_trend": [
      {
        "date": "2024-11-19",
        "rejections": "8",
        "duplicates": "3",
        "unregistered": "4",
        "invalid_input": "1"
      }
    ]
  }
}
```

---

### `GET /api/analytics/responses/baselines`

District baseline data (7-day rolling averages) for comparison.

**Query:** `district`, `scheme_id`

---

## 11. AI Usage & Performance

### `GET /api/analytics/ai/usage`

Token consumption, cost tracking, and call volume.

**Query:** `days`, `start_date`, `end_date`

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_calls": "12",
      "successful_calls": "11",
      "failed_calls": "1",
      "total_prompt_tokens": "10200",
      "total_completion_tokens": "3840",
      "total_tokens": "14040",
      "total_cost_usd": "0.004812",
      "avg_cost_per_call": "0.000401",
      "avg_latency_ms": "1180",
      "p50_latency_ms": "1050",
      "p95_latency_ms": "2300",
      "p99_latency_ms": "3100"
    },
    "by_model": [
      {
        "model": "gpt-4o-mini",
        "calls": "12",
        "tokens": "14040",
        "cost_usd": "0.004812",
        "avg_latency_ms": "1180"
      }
    ],
    "daily_trend": [
      {
        "date": "2024-11-19",
        "calls": "6",
        "successful": "5",
        "failed": "1",
        "tokens": "7020",
        "cost_usd": "0.002406",
        "avg_latency_ms": "1200"
      }
    ]
  }
}
```

---

### `GET /api/analytics/ai/performance`

Latency distribution, error analysis, and per-lambda breakdown.

**Query:** `days`, `start_date`, `end_date`

**Response:**

```json
{
  "success": true,
  "data": {
    "latency_distribution": [
      { "latency_bucket": "500ms-1s", "count": "4" },
      { "latency_bucket": "1s-2s", "count": "6" },
      { "latency_bucket": "2s-5s", "count": "2" }
    ],
    "errors": [{ "error_message": "Request timeout", "count": "1" }],
    "by_lambda": [
      {
        "lambda_name": "ai-interpreter",
        "total_calls": "8",
        "successful": "7",
        "avg_latency_ms": "1100",
        "cost_usd": "0.003200"
      }
    ]
  }
}
```

---

### `GET /api/analytics/ai/classification-accuracy`

Classification distribution and confidence analysis to evaluate AI quality.

**Query:** `days` (default 30), `start_date`, `end_date`, `scheme_id`

**Response:**

```json
{
  "success": true,
  "data": {
    "distribution": [
      {
        "ai_classification": "SUPPLY_FAILURE",
        "count": "2",
        "avg_confidence": "0.840",
        "min_confidence": "0.770",
        "max_confidence": "0.910"
      }
    ],
    "confidence_bands": [
      { "confidence_band": "high (0.7-0.9)", "count": "2" },
      { "confidence_band": "medium (0.5-0.7)", "count": "1" }
    ],
    "classification_vs_status": [
      {
        "ai_classification": "SUPPLY_FAILURE",
        "status": "ASSIGNED",
        "count": "1"
      },
      {
        "ai_classification": "SUPPLY_FAILURE",
        "status": "ESCALATED",
        "count": "1"
      }
    ]
  }
}
```

---

## 12. Health Check

### `GET /health`

No authentication required.

```json
{
  "status": "healthy",
  "service": "analytics-engine",
  "timestamp": "2024-11-19T22:00:00.000Z",
  "services": { "database": "ok" }
}
```

---

## 13. Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "details": ["field-level error 1", "field-level error 2"]
}
```

### HTTP Status Codes

| Code  | Meaning                    |
| ----- | -------------------------- |
| `200` | Success                    |
| `400` | Invalid query parameters   |
| `401` | Missing auth header        |
| `403` | Invalid auth secret / CORS |
| `404` | Resource not found         |
| `429` | Rate limit exceeded        |
| `500` | Internal server error      |
| `503` | Service degraded (DB down) |

---

## 14. TypeScript Interfaces

```typescript
// ─── Common ─────────────────────────────────────────────────
interface ApiResponse<T> {
  success: boolean;
  data: T;
  window?: string;
  count?: number;
  pagination?: Pagination;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string[];
}

// ─── Dashboard ──────────────────────────────────────────────
interface DashboardOverview {
  responses: {
    total_responses: string;
    total_yes: string;
    total_no: string;
    districts_reporting: string;
    pincodes_reporting: string;
    avg_no_pct: string;
    avg_response_rate: string;
  };
  anomalies: {
    total_anomalies: string;
    critical: string;
    high: string;
    medium: string;
    low: string;
    resolved: string;
    open: string;
    ai_classified: string;
    avg_ai_confidence: string;
  };
  beneficiaries: {
    total_beneficiaries: string;
    active_beneficiaries: string;
    schemes_count: string;
    districts_count: string;
  };
  alerts: {
    total_actions: string;
    resolved_actions: string;
    field_visits: string;
    escalations: string;
  };
}

interface TrendPoint {
  date: string; // YYYY-MM-DD
  total_responses: string;
  yes_count: string;
  no_count: string;
  avg_no_pct: string;
}

interface AnomalyTrendPoint {
  date: string;
  total_anomalies: string;
  critical: string;
  high: string;
  medium: string;
  low: string;
}

interface DistrictSummary {
  district: string;
  total_responses: string;
  yes_count: string;
  no_count: string;
  avg_no_pct: string;
  avg_response_rate: string;
  pincodes: string;
  anomaly_count: string;
  critical_count: string;
}

// ─── Anomalies ──────────────────────────────────────────────
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type AnomalyStatus =
  | "NEW"
  | "ASSIGNED"
  | "INVESTIGATING"
  | "FIELD_VISIT"
  | "RESOLVED"
  | "ESCALATED";
type Classification =
  | "SUPPLY_FAILURE"
  | "DEMAND_COLLAPSE"
  | "FRAUD_PATTERN"
  | "DATA_ARTIFACT"
  | "PENDING";
type DetectorType =
  | "NO_SPIKE"
  | "SILENCE"
  | "DUPLICATE_BENEFICIARY"
  | "DISTRICT_ROLLUP";
type Level = "PINCODE" | "BLOCK" | "DISTRICT";
type SchemeId = "PDS" | "PM_KISAN" | "OLD_AGE_PENSION" | "LPG";

interface AnomalyRecord {
  id: string;
  date: string;
  detector_type: DetectorType;
  level: Level;
  pincode: string | null;
  block: string | null;
  district: string;
  state: string;
  scheme_id: SchemeId;
  severity: Severity;
  score: string;
  no_pct: string | null;
  baseline_no_pct: string | null;
  total_responses: number;
  affected_beneficiaries: number;
  ai_classification: Classification | null;
  ai_confidence: string | null;
  ai_reasoning: string | null;
  ai_action: string | null;
  ai_action_ta: string | null;
  ai_urgency: "TODAY" | "THIS_WEEK" | "MONITOR" | null;
  ai_processed_at: string | null;
  status: AnomalyStatus;
  assigned_officer_id: string | null;
  assigned_officer_name: string | null;
  assigned_officer_role: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface AnomalyDetail extends AnomalyRecord {
  raw_data: Record<string, unknown>;
  assigned_officer_email: string | null;
  actions: AlertAction[];
  ai_prompts: AiPromptSummary[];
}

interface AlertAction {
  id: string;
  action_type: string;
  notes: string | null;
  resolution_details: string | null;
  field_visit_location: string | null;
  photos_s3_keys: string[] | null;
  officer_name: string;
  officer_role: string;
  created_at: string;
}

interface AiPromptSummary {
  id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: string;
  latency_ms: number;
  success: boolean;
  called_at: string;
}

// ─── Heatmap ────────────────────────────────────────────────
interface HeatmapCell {
  district: string;
  scheme_id: SchemeId;
  anomaly_count: string;
  critical: string;
  high: string;
  avg_score: string;
  avg_no_pct: string;
}

// ─── Officers ───────────────────────────────────────────────
interface Officer {
  id: string;
  name: string;
  email: string;
  role:
    | "BLOCK_OFFICER"
    | "DISTRICT_COLLECTOR"
    | "STATE_MONITOR"
    | "CENTRAL_MIS";
  district: string | null;
  block: string | null;
  state: string;
  is_active: boolean;
  total_actions: string;
  field_visits: string;
  resolved_count: string;
  escalated_count: string;
  assigned_anomalies: string;
  open_anomalies: string;
}

// ─── Beneficiaries ──────────────────────────────────────────
interface BeneficiaryStat {
  [groupKey: string]: string; // dynamic based on group_by
  total: string;
  active: string;
  inactive: string;
  avg_age: string;
  male: string;
  female: string;
  other_gender: string;
}

interface BeneficiaryDistribution {
  by_age: { age_range: string; count: string }[];
  by_gender: { gender: string; count: string }[];
  by_scheme: { scheme_id: SchemeId; count: string }[];
  by_language: { language: string; count: string }[];
}

// ─── Schemes ────────────────────────────────────────────────
interface SchemeOverview {
  scheme_id: SchemeId;
  scheme_name_en: string;
  scheme_name_ta: string;
  is_active: boolean;
  total_responses: string;
  avg_no_pct: string;
  avg_response_rate: string;
  anomaly_count: string;
  critical_anomalies: string;
  total_beneficiaries: string;
  active_beneficiaries: string;
}

// ─── AI ─────────────────────────────────────────────────────
interface AiUsageSummary {
  total_calls: string;
  successful_calls: string;
  failed_calls: string;
  total_tokens: string;
  total_cost_usd: string;
  avg_cost_per_call: string;
  avg_latency_ms: string;
  p50_latency_ms: string;
  p95_latency_ms: string;
  p99_latency_ms: string;
}
```

---

## 15. Frontend Integration Guide

### API Client Setup

```typescript
const ANALYTICS_BASE =
  import.meta.env.VITE_ANALYTICS_API_URL || "http://localhost:3001";
const ENGINE_SECRET = import.meta.env.VITE_ENGINE_SECRET;

async function analyticsGet<T>(
  path: string,
  params?: Record<string, string | number>,
): Promise<ApiResponse<T>> {
  const url = new URL(`${ANALYTICS_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Engine-Secret": ENGINE_SECRET,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
```

### Usage Examples

```typescript
// Dashboard overview — last 7 days
const overview = await analyticsGet<DashboardOverview>(
  "/api/analytics/dashboard/overview",
  { days: 7 },
);

// Anomalies filtered by severity and scheme
const anomalies = await analyticsGet<AnomalyRecord[]>(
  "/api/analytics/anomalies",
  {
    severity: "CRITICAL",
    scheme_id: "PDS",
    page: 1,
    limit: 10,
  },
);

// Anomaly detail with action timeline
const detail = await analyticsGet<AnomalyDetail>(
  `/api/analytics/anomalies/${anomalyId}`,
);

// Trends for a specific district
const trends = await analyticsGet("/api/analytics/dashboard/trends", {
  district: "Villupuram",
  days: 30,
});

// Scheme performance
const schemes = await analyticsGet<SchemeOverview[]>("/api/analytics/schemes", {
  days: 14,
});

// AI cost tracking
const aiUsage = await analyticsGet("/api/analytics/ai/usage", { days: 30 });

// Beneficiary demographics
const demographics = await analyticsGet<BeneficiaryDistribution>(
  "/api/analytics/beneficiaries/distribution",
  {
    district: "Chengalpattu",
  },
);

// Officer list with activity stats
const officers = await analyticsGet<Officer[]>("/api/analytics/officers", {
  district: "Villupuram",
});

// Daily response trends (30 days)
const responseTrends = await analyticsGet("/api/analytics/responses/trends", {
  days: 30,
});

// Rejection analytics
const rejections = await analyticsGet("/api/analytics/responses/rejections", {
  days: 7,
});

// Date range query
const rangeData = await analyticsGet("/api/analytics/dashboard/overview", {
  start_date: "2024-11-01",
  end_date: "2024-11-30",
});
```

### Environment Variables

```env
VITE_ANALYTICS_API_URL=http://localhost:3001
VITE_ENGINE_SECRET=<your-engine-secret>
```

### S3 Configuration (Server-side)

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
S3_REPORT_BUCKET=welfarewatch-reports
S3_PRESIGN_EXPIRES=3600
```

### Rate Limits

- **120 requests/minute** per IP (configurable via `RATE_LIMIT_MAX`)
- Response header `X-RateLimit-Remaining` shows remaining quota
- HTTP `429` returned when exceeded

### Request Headers

| Header            | Required | Description                          |
| ----------------- | -------- | ------------------------------------ |
| `X-Engine-Secret` | Yes      | Authentication secret                |
| `X-Request-ID`    | No       | Client-generated UUID for tracing    |
| `Content-Type`    | No       | `application/json` (for consistency) |

### Response Headers

| Header                  | Description                    |
| ----------------------- | ------------------------------ |
| `X-Request-ID`          | Echo of client ID or generated |
| `X-RateLimit-Remaining` | Remaining requests in window   |

---

## Endpoint Summary Table

| Method | Endpoint                                    | Description                             |
| ------ | ------------------------------------------- | --------------------------------------- |
| GET    | `/health`                                   | Service health (no auth)                |
| GET    | `/api/analytics/dashboard/overview`         | Dashboard key metrics                   |
| GET    | `/api/analytics/dashboard/trends`           | Response + anomaly time-series          |
| GET    | `/api/analytics/dashboard/district-summary` | Per-district breakdown                  |
| GET    | `/api/analytics/anomalies`                  | Paginated anomaly list + filters        |
| GET    | `/api/analytics/anomalies/summary`          | Anomaly aggregates by dimension         |
| GET    | `/api/analytics/anomalies/heatmap`          | District × scheme heatmap data          |
| GET    | `/api/analytics/anomalies/:id`              | Full anomaly + action timeline          |
| GET    | `/api/analytics/reports`                    | Paginated daily reports                 |
| GET    | `/api/analytics/reports/:id`                | Full report + anomalies + notifications |
| GET    | `/api/analytics/reports/:id/pdf`            | Presigned S3 URL for report PDF         |
| GET    | `/api/analytics/reports/district/:district` | District-specific reports               |
| GET    | `/api/analytics/officers`                   | Officers list + activity stats          |
| GET    | `/api/analytics/officers/:id`               | Officer profile + history               |
| GET    | `/api/analytics/officers/:id/actions`       | Officer action timeline (paginated)     |
| GET    | `/api/analytics/beneficiaries/stats`        | Grouped beneficiary statistics          |
| GET    | `/api/analytics/beneficiaries/distribution` | Demographics breakdown                  |
| GET    | `/api/analytics/beneficiaries/coverage`     | Response coverage vs enrollment         |
| GET    | `/api/analytics/schemes`                    | All schemes with metrics                |
| GET    | `/api/analytics/schemes/:schemeId`          | Single scheme deep-dive                 |
| GET    | `/api/analytics/responses/daily`            | Daily response records (paginated)      |
| GET    | `/api/analytics/responses/trends`           | Response aggregates time-series         |
| GET    | `/api/analytics/responses/rejections`       | Rejection analytics                     |
| GET    | `/api/analytics/responses/baselines`        | District baseline data                  |
| GET    | `/api/analytics/ai/usage`                   | Token/cost/call volume tracking         |
| GET    | `/api/analytics/ai/performance`             | Latency distribution + error analysis   |
| GET    | `/api/analytics/ai/classification-accuracy` | Classification quality metrics          |
