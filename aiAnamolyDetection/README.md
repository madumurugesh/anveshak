# WelfareWatch — AI Anomaly Engine

Express.js service that classifies welfare anomalies using OpenAI
and writes results back to the `anomaly_records` PostgreSQL table.

---

## Project Structure

```
anomaly-engine/
├── server.js                   # Express app entry point
├── .env.example                # Environment variable template
├── package.json
├── config/
│   ├── db.js                   # PostgreSQL connection pool
│   └── logger.js               # Winston logger
├── prompts/
│   └── systemPrompt.js         # Full OpenAI system prompt
├── services/
│   └── openaiService.js        # OpenAI call + DB write logic
├── middleware/
│   └── validate.js             # Joi request validation
└── routes/
    └── anomaly.js              # Route handlers
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your OpenAI key, DB credentials, ENGINE_SECRET

# 3. Start development server
npm run dev

# 4. Start production server
npm start
```

---

## API Endpoints

All endpoints require the header:
```
x-engine-secret: <ENGINE_SECRET from .env>
```

---

### POST /api/anomaly/classify
Classify a single anomaly record.

**Request body:**
```json
{
  "id": "uuid-of-anomaly-record",
  "detector_type": "NO_SPIKE",
  "level": "PINCODE",
  "pincode": "605001",
  "block": "Vikravandi",
  "district": "Villupuram",
  "state": "Tamil Nadu",
  "scheme_id": "PDS",
  "severity": "CRITICAL",
  "score": 4.2,
  "no_pct": 0.78,
  "baseline_no_pct": 0.31,
  "total_responses": 142,
  "affected_beneficiaries": 210,
  "raw_data": { "z_score": 4.2, "window": "2024-11-19#14" },
  "date": "2024-11-19"
}
```

**Response:**
```json
{
  "success": true,
  "anomaly_id": "uuid",
  "result": {
    "ai_classification": "SUPPLY_FAILURE",
    "ai_confidence": 0.91,
    "ai_reasoning": "NO% reached 78% against a 31% baseline...",
    "ai_action": "Visit FPS store at pincode 605001...",
    "ai_action_ta": "605001 இல் உள்ள FPS கடைக்கு...",
    "ai_urgency": "TODAY",
    "signals_used": ["z_score_4.2", "pds_distribution_window"],
    "confidence_adjustments": [{ "factor": "high_sample_size", "delta": 0.05 }]
  },
  "meta": {
    "model": "gpt-4o-mini",
    "total_tokens": 420,
    "latency_ms": 1840,
    "cost_usd": 0.000126
  }
}
```

---

### POST /api/anomaly/classify/batch
Classify up to BATCH_SIZE (default 5) anomaly records.

**Request body:**
```json
{
  "anomalies": [ { ...anomaly1 }, { ...anomaly2 } ]
}
```

**Response:**
```json
{
  "success": true,
  "summary": { "total": 2, "succeeded": 2, "failed": 0 },
  "results": [ { ... }, { ... } ]
}
```

---

### POST /api/anomaly/classify/pending
Pull unclassified anomalies from DB and process them.
Ordered by severity (CRITICAL first).

**Query params:**
- `limit` — max records to process (default: BATCH_SIZE)

**Response:**
```json
{
  "success": true,
  "summary": { "total": 3, "succeeded": 3, "failed": 0 },
  "results": [ ... ]
}
```

---

### GET /api/anomaly/:id/result
Fetch AI classification for a specific anomaly.

---

### GET /api/anomaly/stats
7-day aggregated stats — classification counts + OpenAI cost summary.

---

### GET /health
Health check — no auth required. Returns DB and OpenAI config status.

---

## Lambda Integration

To trigger from your detection Lambda (Node.js):

```javascript
const response = await fetch(`${process.env.ENGINE_URL}/api/anomaly/classify`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-engine-secret": process.env.ENGINE_SECRET,
  },
  body: JSON.stringify(anomalyRecord),
});
const data = await response.json();
```

Or use the `/classify/pending` endpoint on a nightly EventBridge schedule
to batch-process all anomalies that were created before the AI layer ran.

---

## Environment Variables

| Variable               | Description                          | Default        |
|------------------------|--------------------------------------|----------------|
| OPENAI_API_KEY         | OpenAI secret key                    | required       |
| OPENAI_MODEL           | Model to use                         | gpt-4o-mini    |
| OPENAI_MAX_TOKENS      | Max completion tokens                | 600            |
| OPENAI_TEMPERATURE     | Sampling temperature                 | 0.2            |
| OPENAI_TIMEOUT_MS      | API call timeout                     | 15000          |
| DB_HOST                | RDS endpoint                         | required       |
| DB_PORT                | PostgreSQL port                      | 5432           |
| DB_NAME                | Database name                        | required       |
| DB_USER                | DB username                          | required       |
| DB_PASSWORD            | DB password                          | required       |
| DB_SSL                 | Use SSL for DB connection            | true           |
| PORT                   | Express server port                  | 3000           |
| ENGINE_SECRET          | Internal auth header value           | required       |
| BATCH_SIZE             | Max batch size                       | 5              |
| RATE_LIMIT_WINDOW_MS   | Rate limit window                    | 60000          |
| RATE_LIMIT_MAX         | Max requests per window              | 60             |