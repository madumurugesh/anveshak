# anveshak

## Services

| Service                   | Port | Description                                                                                      |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------ |
| Ingestion Service         | 8000 | Receives IVR webhook callbacks, validates beneficiaries, deduplicates, and streams to Kinesis    |
| Stream Processing Service | 8001 | Consumes Kinesis stream, aggregates in DynamoDB, flushes metrics to RDS hourly                   |
| Anomaly Detection Service | 8002 | Reads daily_responses from RDS, flags statistical outliers, uses OpenAI for intelligent analysis |

## Anomaly Detection Service

Uses OpenAI's GPT model to analyse aggregated IVR response data and identify anomalous patterns across regions and government schemes.

### Endpoints

- **GET** `/health` - Health check
- **POST** `/api/anomaly/analyse` - Trigger anomaly analysis (optional body: `report_date`, `z_score_threshold`)
- **GET** `/api/anomaly/reports?limit=20` - List recent analysis reports

### Environment Variables

| Variable                    | Required | Default  | Description                              |
| --------------------------- | -------- | -------- | ---------------------------------------- |
| `OPENAI_API_KEY`            | Yes      | -        | OpenAI API key                           |
| `OPENAI_MODEL`              | No       | `gpt-4o` | OpenAI model to use                      |
| `Z_SCORE_THRESHOLD`         | No       | `2.0`    | Flag rows with \|z_score\| >= this value |
| `ANALYSIS_INTERVAL_SECONDS` | No       | `21600`  | Background analysis interval (6 hours)   |
| `PG_HOST`                   | Yes      | -        | PostgreSQL host                          |
| `PG_PORT`                   | No       | `5432`   | PostgreSQL port                          |
| `PG_USER`                   | Yes      | -        | PostgreSQL user                          |
| `PG_PASSWORD`               | Yes      | -        | PostgreSQL password                      |
| `PG_DATABASE`               | Yes      | -        | PostgreSQL database                      |

### How It Works

1. Reads all `daily_responses` rows for a given date from RDS
2. Flags records where `|z_score| >= threshold` as anomalies
3. Sends flagged records + summary statistics to OpenAI for analysis
4. OpenAI returns a human-readable report identifying root causes and priorities
5. The report is persisted to the `anomaly_reports` table in RDS
6. A background scheduler repeats this automatically every 6 hours
