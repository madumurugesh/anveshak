# Anveshak - AWS Console (UI) Setup Guide for Learner Labs

> **Designed for AWS Academy Learner Labs** - no custom IAM roles, no custom VPCs, no CLI needed.
> Every step uses the **AWS Management Console** with screenshots-style instructions.

| Service                       | Port | Purpose                                      |
| ----------------------------- | ---- | -------------------------------------------- |
| **Ingestion Service**         | 8000 | `/api/ivr/webhook` - validate, dedup, stream |
| **Stream Processing Service** | 8001 | Kinesis consumer + hourly RDS flush          |

---

## Architecture Overview

```
Citizen IVR Call
      │
      ▼
┌──────────────┐    POST /api/ivr/webhook
│  Ingestion   │──────────────────────────┐
│  Service     │                          │
│  (FastAPI)   │                          │
└───┬──────┬───┘                          │
    │      │                              │
    │      ▼                              ▼
    │  RDS PostgreSQL             DynamoDB
    │  (beneficiaries)            (response_dedup)
    │                                     │
    │      ┌──────────────────────────────┘
    │      │  if not duplicate
    │      ▼
    │  Kinesis Data Stream
    │  (ivr-responses-stream)
    │      │
    │      ▼
    │  ┌──────────────────┐
    │  │ Stream Processing │
    │  │ Service (FastAPI) │
    │  └───┬──────────┬───┘
    │      │          │
    │      ▼          ▼
    │  DynamoDB    RDS PostgreSQL
    │  (responses_ (daily_responses)
    │   dynamo_ref)   ← hourly flush
    └─────────────────┘
```

---

## Learner Labs Limitations & Workarounds

| Restriction                          | Workaround                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| Cannot create IAM roles              | Use the pre-created **`LabRole`**                                                          |
| Cannot create custom VPCs            | Use the **default VPC** (already exists)                                                   |
| Region may be locked to `us-east-1`  | Use `us-east-1` for all resources                                                          |
| Sessions expire after ~4 hours       | Resources persist across sessions in the same lab, but re-check if anything was cleaned up |
| No custom domains / ACM certificates | Skip HTTPS - use HTTP directly                                                             |

---

## Prerequisites

- An **AWS Academy Learner Lab** session started (green circle next to "AWS" button).
- Click **"AWS"** button to open the AWS Management Console.
- **Python 3.12+** installed locally for running services.
- Note down your **Account ID** (top-right corner of console → click your username → copy the 12-digit number).

---

## Step 1 - Verify the Default VPC & Note Subnet IDs

> **Do NOT create a new VPC.** Learner Labs provides a default VPC.

1. Open the AWS Console.
2. In the top search bar, type **VPC** and click **VPC** under Services.
3. In the left sidebar, click **Your VPCs**.
4. You should see a VPC marked **Yes** under the "Default VPC" column. Note its **VPC ID** (e.g., `vpc-0abc123...`).
5. In the left sidebar, click **Subnets**.
6. You'll see multiple subnets belonging to the default VPC. Note down **any two Subnet IDs** that are in **different Availability Zones** (check the "Availability Zone" column).
   - Example: `subnet-aaa111` in `us-east-1a`, `subnet-bbb222` in `us-east-1b`

> **Write these down - you'll need them for RDS and ECS.**

---

## Step 2 - Create a Security Group for RDS

1. Still in the **VPC** console, click **Security groups** in the left sidebar.
2. Click **Create security group**.
3. Fill in:
   - **Security group name:** `anveshak-rds-sg`
   - **Description:** `Allow PostgreSQL access from default VPC`
   - **VPC:** Select the **default VPC** from the dropdown.
4. Under **Inbound rules**, click **Add rule**:
   - **Type:** PostgreSQL (this auto-fills port `5432`)
   - **Source type:** Select **My IP** from the dropdown (this allows your local machine to connect)
5. Click **Add rule** again to add a **second** inbound rule:
   - **Type:** PostgreSQL
   - **Source type:** Select **Anywhere-IPv4** from the dropdown (this allows ECS tasks within the VPC to connect)
     > Since this is a Learner Lab (no production data), Anywhere-IPv4 (`0.0.0.0/0`) is fine. In production, you'd restrict this to the VPC CIDR only.
6. Leave **Outbound rules** as default (Allow all).
7. Click **Create security group**.
8. Note the **Security Group ID** (e.g., `sg-0xyz789...`).

---

## Step 3 - Provision RDS PostgreSQL

### 3.1 Create the Database

1. In the top search bar, type **RDS** and click **RDS** under Services.
2. In the left sidebar, click **Databases**.
3. Click **Create database**.
4. Choose the following options:

   | Setting                    | Value                                            |
   | -------------------------- | ------------------------------------------------ |
   | **Creation method**        | Standard create                                  |
   | **Engine type**            | PostgreSQL                                       |
   | **Engine version**         | PostgreSQL 16.x (pick the latest 16.x available) |
   | **Templates**              | **Free tier**                                    |
   | **DB instance identifier** | `anveshak-db`                                    |
   | **Master username**        | `anveshak_admin`                                 |
   | **Credentials management** | Self managed                                     |
   | **Master password**        | Choose a strong password and **write it down**   |
   | **DB instance class**      | `db.t3.micro` (or `db.t4g.micro` if shown)       |
   | **Storage type**           | General Purpose SSD (gp2)                        |
   | **Allocated storage**      | `20` GB                                          |
   | **Storage autoscaling**    | Uncheck "Enable"                                 |

5. Under **Connectivity**:

   | Setting                | Value                                                                      |
   | ---------------------- | -------------------------------------------------------------------------- |
   | **Compute resource**   | Don't connect to an EC2 compute resource                                   |
   | **VPC**                | Default VPC                                                                |
   | **DB subnet group**    | Create new (or "default" if pre-existing)                                  |
   | **Public access**      | **Yes** (so you can connect from your local machine to run SQL migrations) |
   | **VPC security group** | Choose existing → select **`anveshak-rds-sg`**                             |
   | **Availability Zone**  | No preference                                                              |

6. Under **Additional configuration**:

   | Setting                   | Value                                   |
   | ------------------------- | --------------------------------------- |
   | **Initial database name** | `anveshak`                              |
   | **Backup retention**      | 1 day (to save costs)                   |
   | **Encryption**            | Uncheck (Learner Labs may restrict KMS) |
   | **Monitoring**            | Uncheck Enhanced Monitoring             |

7. Click **Create database**.
8. Wait 5–10 minutes for status to become **Available**.
9. Click on `anveshak-db` → note the **Endpoint** (e.g., `anveshak-db.c1234.us-east-1.rds.amazonaws.com`).

### 3.2 Run the SQL Migrations

Open a terminal on your local machine:

```bash
psql -h anveshak-db.c1234.us-east-1.rds.amazonaws.com -U anveshak_admin -d anveshak -f sql/init.sql
```

Replace the host with your actual RDS endpoint. Enter the master password when prompted.

> **Don't have `psql`?** Use **pgAdmin** or any PostgreSQL client. Connect with the endpoint, port `5432`, username `anveshak_admin`, database `anveshak`, and run the contents of `sql/init.sql`.

This creates:

- `beneficiaries` - phone_hash lookup table.
- `daily_responses` - hourly aggregated metrics.

### 3.3 (Optional) Seed the Beneficiaries Table

Insert some test data so the ingestion service can validate phone hashes:

```sql
INSERT INTO beneficiaries (phone_hash, name, pincode) VALUES
  ('abc123hash', 'Test Citizen 1', '560001'),
  ('def456hash', 'Test Citizen 2', '110001');
```

---

## Step 4 - Create DynamoDB Tables

### 4.1 Create `response_dedup`

1. In the top search bar, type **DynamoDB** and click **DynamoDB** under Services.
2. In the left sidebar, click **Tables**.
3. Click **Create table**.
4. Fill in:

   | Setting                          | Value                   |
   | -------------------------------- | ----------------------- |
   | **Table name**                   | `response_dedup`        |
   | **Partition key**                | `pk` (type: **String**) |
   | **Sort key**                     | Leave empty             |
   | **Table settings**               | Customize settings      |
   | **Read/write capacity settings** | **On-demand**           |

5. Click **Create table**.
6. Wait for status to become **Active**.

**Enable TTL (optional - auto-deletes old entries after 24h):**

1. Click on the table name `response_dedup`.
2. Go to the **Additional settings** tab.
3. In the **Time to Live (TTL)** section, click **Turn on**.
4. Set **TTL attribute name** to: `ttl`
5. Click **Turn on TTL**.

### 4.2 Create `responses_dynamo_ref`

1. Go back to **DynamoDB → Tables → Create table**.
2. Fill in:

   | Setting                          | Value                   |
   | -------------------------------- | ----------------------- |
   | **Table name**                   | `responses_dynamo_ref`  |
   | **Partition key**                | `pk` (type: **String**) |
   | **Sort key**                     | Leave empty             |
   | **Table settings**               | Customize settings      |
   | **Read/write capacity settings** | **On-demand**           |

3. Click **Create table**.
4. Wait for status to become **Active**.

---

## Step 5 - Create the Kinesis Data Stream

1. In the top search bar, type **Kinesis** and click **Kinesis** under Services.
2. Click **Create data stream**.
3. Fill in:

   | Setting                   | Value                  |
   | ------------------------- | ---------------------- |
   | **Data stream name**      | `ivr-responses-stream` |
   | **Capacity mode**         | **Provisioned**        |
   | **Number of open shards** | `2`                    |

4. Click **Create data stream**.
5. Wait for status to become **Active**.

---

## Step 6 - Get AWS Credentials for Local Development

> **Learner Labs does NOT allow creating IAM roles or users.** Instead, use the temporary credentials provided by the lab.

1. Go back to the **Learner Lab** page (the page with the Start/Stop Lab buttons, NOT the AWS Console).
2. Click the **"AWS Details"** button (or the `(i)` icon next to the AWS button).
3. Click **Show** next to **AWS CLI**.
4. You will see three values:
   - `aws_access_key_id`
   - `aws_secret_access_key`
   - `aws_session_token`
5. **Copy all three** - you'll need them for your `.env` files.

> **These credentials expire** when your lab session ends (~4 hours). You'll need to copy fresh credentials each session.

---

## Step 7 - Configure & Run Services Locally

### 7.1 Create `.env` for Ingestion Service

Create a file `ingestion-service/.env`:

```env
# PostgreSQL (RDS)
PG_HOST=anveshak-db.xxxxx.us-east-1.rds.amazonaws.com
PG_PORT=5432
PG_USER=anveshak_admin
PG_PASSWORD=your_rds_password_here
PG_DATABASE=anveshak

# DynamoDB
DYNAMODB_TABLE_DEDUP=response_dedup
AWS_REGION=us-east-1

# Kinesis
KINESIS_STREAM_NAME=ivr-responses-stream

# AWS Credentials (from Learner Lab → AWS Details → AWS CLI)
AWS_ACCESS_KEY_ID=ASIA...
AWS_SECRET_ACCESS_KEY=xxxx...
AWS_SESSION_TOKEN=FwoGZXIv...
```

> **Important:** You MUST also set `AWS_SESSION_TOKEN` as an environment variable. Learner Lab credentials require it. If your config doesn't have a field for it, set it as an OS environment variable before running the app.

### 7.2 Create `.env` for Stream Processing Service

Create a file `stream-processing-service/.env`:

```env
# PostgreSQL (RDS)
PG_HOST=anveshak-db.xxxxx.us-east-1.rds.amazonaws.com
PG_PORT=5432
PG_USER=anveshak_admin
PG_PASSWORD=your_rds_password_here
PG_DATABASE=anveshak

# DynamoDB
DYNAMODB_TABLE_AGG=responses_dynamo_ref
AWS_REGION=us-east-1

# Kinesis
KINESIS_STREAM_NAME=ivr-responses-stream

# Processing window (seconds)
WINDOW_SECONDS=3600

# AWS Credentials (from Learner Lab → AWS Details → AWS CLI)
AWS_ACCESS_KEY_ID=ASIA...
AWS_SECRET_ACCESS_KEY=xxxx...
AWS_SESSION_TOKEN=FwoGZXIv...
```

### 7.3 Install Dependencies & Run

Open **two terminals**:

**Terminal 1 - Ingestion Service:**

```bash
cd ingestion-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Stream Processing Service:**

```bash
cd stream-processing-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### 7.4 Test the Webhook

```bash
curl -X POST http://localhost:8000/api/ivr/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"phone_hash\": \"abc123hash\", \"scheme_id\": \"PM-KISAN\", \"pincode\": \"560001\", \"response_value\": 3}"
```

> On Windows, use `^` for line continuation and escaped double quotes as shown above, or use Postman/Thunder Client instead.

---

## Step 8 - (Optional) Deploy to ECS Fargate via Console

> This is optional for Learner Labs. Running locally (Step 7) is sufficient for development and testing.

### 8.1 Create ECR Repositories

1. Search for **ECR** (Elastic Container Registry) in the console.
2. Click **Create repository**.
   - **Visibility:** Private
   - **Repository name:** `anveshak/ingestion-service`
   - Click **Create repository**.
3. Repeat for `anveshak/stream-processing-service`.

### 8.2 Push Docker Images (from local terminal)

```bash
# Get ECR login (replace ACCOUNT_ID and REGION)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push ingestion service
cd ingestion-service
docker build -t anveshak/ingestion-service .
docker tag anveshak/ingestion-service:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/anveshak/ingestion-service:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/anveshak/ingestion-service:latest

# Build and push stream processing service
cd ../stream-processing-service
docker build -t anveshak/stream-processing-service .
docker tag anveshak/stream-processing-service:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/anveshak/stream-processing-service:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/anveshak/stream-processing-service:latest
```

### 8.3 Create ECS Cluster

1. Search for **ECS** in the console.
2. Click **Clusters** → **Create cluster**.
3. Fill in:
   - **Cluster name:** `anveshak-cluster`
   - **Infrastructure:** AWS Fargate (serverless) - should be selected by default.
4. Click **Create**.

### 8.4 Create Task Definitions

**Ingestion Service Task:**

1. In ECS, click **Task definitions** → **Create new task definition**.
2. Fill in:

   | Setting                    | Value               |
   | -------------------------- | ------------------- |
   | **Task definition family** | `ingestion-service` |
   | **Launch type**            | AWS Fargate         |
   | **OS/Architecture**        | Linux/X86_64        |
   | **CPU**                    | 0.25 vCPU           |
   | **Memory**                 | 0.5 GB              |
   | **Task role**              | `LabRole`           |
   | **Task execution role**    | `LabRole`           |

3. Under **Container - 1**:

   | Setting            | Value                                                                          |
   | ------------------ | ------------------------------------------------------------------------------ |
   | **Name**           | `ingestion-service`                                                            |
   | **Image URI**      | `ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/anveshak/ingestion-service:latest` |
   | **Container port** | `8000`                                                                         |
   | **Protocol**       | TCP                                                                            |

4. Expand **Environment variables** and add:

   | Key                    | Value                  |
   | ---------------------- | ---------------------- |
   | `PG_HOST`              | Your RDS endpoint      |
   | `PG_PORT`              | `5432`                 |
   | `PG_USER`              | `anveshak_admin`       |
   | `PG_PASSWORD`          | Your RDS password      |
   | `PG_DATABASE`          | `anveshak`             |
   | `DYNAMODB_TABLE_DEDUP` | `response_dedup`       |
   | `AWS_REGION`           | `us-east-1`            |
   | `KINESIS_STREAM_NAME`  | `ivr-responses-stream` |

5. Click **Create**.

**Stream Processing Service Task:** Repeat the above with:

- **Family:** `stream-processing-service`
- **Container name:** `stream-processing-service`
- **Image:** `ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/anveshak/stream-processing-service:latest`
- **Port:** `8001`
- **Extra env vars:** `DYNAMODB_TABLE_AGG` = `responses_dynamo_ref`, `WINDOW_SECONDS` = `3600`

### 8.5 Create Services

1. Go to **ECS → Clusters → anveshak-cluster**.
2. Under the **Services** tab, click **Create**.
3. Fill in:

   | Setting             | Value                                 |
   | ------------------- | ------------------------------------- |
   | **Launch type**     | FARGATE                               |
   | **Task definition** | `ingestion-service` (latest revision) |
   | **Service name**    | `ingestion-service`                   |
   | **Desired tasks**   | `1`                                   |

4. Under **Networking**:
   - **VPC:** Default VPC
   - **Subnets:** Select at least 2
   - **Security group:** Create new or use the existing `anveshak-rds-sg` (ensure port 8000 is allowed inbound)
   - **Public IP:** **Turned on** (so you can access the service directly)

5. Click **Create**.
6. Repeat for `stream-processing-service` (desired tasks = 1, port 8001).

---

## Quick-Reference: All AWS Resources Created

| #   | Service  | Resource               | Name                                                      | Created Via        |
| --- | -------- | ---------------------- | --------------------------------------------------------- | ------------------ |
| 1   | VPC      | Default VPC            | (pre-existing)                                            | N/A                |
| 2   | VPC      | Security Group         | `anveshak-rds-sg`                                         | Console            |
| 3   | RDS      | PostgreSQL Instance    | `anveshak-db`                                             | Console            |
| 4   | DynamoDB | Table                  | `response_dedup`                                          | Console            |
| 5   | DynamoDB | Table                  | `responses_dynamo_ref`                                    | Console            |
| 6   | Kinesis  | Data Stream (2 shards) | `ivr-responses-stream`                                    | Console            |
| 7   | IAM      | Role                   | `LabRole` (pre-existing)                                  | N/A                |
| 8   | ECR      | Repository (×2)        | `anveshak/ingestion-service`, `stream-processing-service` | Console (optional) |
| 9   | ECS      | Fargate Cluster        | `anveshak-cluster`                                        | Console (optional) |

---

## Environment Variables Reference

### Ingestion Service (`ingestion-service/.env`)

| Variable                | Required | Default                | Description                                       |
| ----------------------- | -------- | ---------------------- | ------------------------------------------------- |
| `PG_HOST`               | Yes      | -                      | RDS endpoint                                      |
| `PG_PORT`               | No       | `5432`                 | PostgreSQL port                                   |
| `PG_USER`               | Yes      | -                      | DB username                                       |
| `PG_PASSWORD`           | Yes      | -                      | DB password                                       |
| `PG_DATABASE`           | Yes      | -                      | Database name (`anveshak`)                        |
| `DYNAMODB_TABLE_DEDUP`  | No       | `response_dedup`       | DynamoDB dedup table                              |
| `AWS_REGION`            | No       | `ap-south-1`           | AWS region (**use `us-east-1` for Learner Labs**) |
| `KINESIS_STREAM_NAME`   | No       | `ivr-responses-stream` | Kinesis stream                                    |
| `AWS_ACCESS_KEY_ID`     | Yes\*    | -                      | From Learner Lab credentials                      |
| `AWS_SECRET_ACCESS_KEY` | Yes\*    | -                      | From Learner Lab credentials                      |
| `AWS_SESSION_TOKEN`     | Yes\*    | -                      | From Learner Lab credentials (set as OS env var)  |

### Stream Processing Service (`stream-processing-service/.env`)

| Variable                | Required | Default                | Description                                       |
| ----------------------- | -------- | ---------------------- | ------------------------------------------------- |
| `PG_HOST`               | Yes      | -                      | RDS endpoint                                      |
| `PG_PORT`               | No       | `5432`                 | PostgreSQL port                                   |
| `PG_USER`               | Yes      | -                      | DB username                                       |
| `PG_PASSWORD`           | Yes      | -                      | DB password                                       |
| `PG_DATABASE`           | Yes      | -                      | Database name (`anveshak`)                        |
| `DYNAMODB_TABLE_AGG`    | No       | `responses_dynamo_ref` | DynamoDB aggregation table                        |
| `AWS_REGION`            | No       | `ap-south-1`           | AWS region (**use `us-east-1` for Learner Labs**) |
| `KINESIS_STREAM_NAME`   | No       | `ivr-responses-stream` | Kinesis stream                                    |
| `WINDOW_SECONDS`        | No       | `3600`                 | Aggregation flush interval                        |
| `AWS_ACCESS_KEY_ID`     | Yes\*    | -                      | From Learner Lab credentials                      |
| `AWS_SECRET_ACCESS_KEY` | Yes\*    | -                      | From Learner Lab credentials                      |
| `AWS_SESSION_TOKEN`     | Yes\*    | -                      | From Learner Lab credentials (set as OS env var)  |

> _\*Not needed if running on ECS with `LabRole` attached as the task role._

---

## Troubleshooting

| Problem                                           | Solution                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ExpiredTokenException` when calling AWS services | Your lab session expired. Go back to Learner Lab page → copy fresh credentials from **AWS Details** → update `.env` files.   |
| `AccessDeniedException` on IAM operations         | Learner Labs blocks IAM. Use the `LabRole` instead of creating custom roles.                                                 |
| Cannot connect to RDS from local machine          | Ensure the RDS security group has an inbound rule for **My IP** on port 5432, and that **Public access = Yes**.              |
| DynamoDB table not found                          | Check you created the tables in the correct region (`us-east-1`). Check the region dropdown in the top-right of the console. |
| Kinesis `ResourceNotFoundException`               | Verify the stream name matches exactly: `ivr-responses-stream`. Check the region.                                            |
| `UnrecognizedClientException`                     | You're missing `AWS_SESSION_TOKEN`. Learner Lab credentials require all three: key ID, secret key, AND session token.        |

---

## Cost

All resources used here fall within **AWS Academy Learner Labs free credit** - no personal billing is involved as long as you stay within the lab environment.

---

_Last updated: 2026-03-07_
