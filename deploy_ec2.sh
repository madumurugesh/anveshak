#!/bin/bash
set -e

# ============================================================
#  WelfareWatch / Anveshak — Single-script EC2 Deployer
#  Run this on a fresh Amazon Linux 2023 or Ubuntu 22.04 EC2
#  Usage:  chmod +x deploy_ec2.sh && sudo ./deploy_ec2.sh
# ============================================================

# ---------------------- CONFIGURATION -----------------------
# >>> EDIT THESE VALUES BEFORE RUNNING <<<

APP_DIR="/home/ec2-user/app"
REPO_URL=""                          # your git repo URL (leave empty to skip clone)
BRANCH="main"

# Database (RDS)
DB_HOST=""
DB_PORT="5432"
DB_NAME="postgres"
DB_USER=""
DB_PASSWORD=""

# AWS Credentials
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_SESSION_TOKEN=""

# Cognito
COGNITO_USER_POOL_ID="us-east-1_aB19Y5peT"
COGNITO_CLIENT_ID="2nprgmun53mehvg5bnqjkqmo8k"

# OpenAI
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"

# S3
S3_REPORT_BUCKET="anveshak-reports"
S3_DATA_BUCKET="anveshak-data"

# Secrets
ENGINE_SECRET=""

# Domain / IP  (used for CORS and frontend API URLs)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")
DOMAIN="${PUBLIC_IP}"

# DynamoDB / Kinesis / Lambda
DYNAMODB_TABLE_DEDUP="anveshak-response-dedup"
KINESIS_STREAM_NAME="anveshak-ivr-responses"
S3_REJECTED_PREFIX="rejected-responses/"
LAMBDA_POST_INGEST="anveshak-post-ingest-trigger"

# Deployment mode for Python services: "docker" or "venv"
PYTHON_DEPLOY_MODE="venv"

# ---------------------- COLOURS -----------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------------------- DETECT OS ---------------------------
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
else
    OS_ID="unknown"
fi

info "Detected OS: $OS_ID"

# ---------------------- SYSTEM PACKAGES ---------------------
info "Installing system packages..."

if [[ "$OS_ID" == "amzn" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" ]]; then
    sudo yum update -y
    sudo yum install -y git curl gcc-c++ make
    # Node.js 20
    if ! command -v node &>/dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    fi
    # Python 3.12
    if ! command -v python3.12 &>/dev/null; then
        sudo yum install -y python3.12 python3.12-pip python3.12-devel
    fi
    PYTHON_BIN="python3.12"
    # Nginx
    sudo yum install -y nginx
elif [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential
    # Node.js 20
    if ! command -v node &>/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
        sudo apt install -y nodejs
    fi
    # Python 3.12
    if ! command -v python3.12 &>/dev/null; then
        sudo apt install -y python3.12 python3.12-venv python3.12-dev python3-pip
    fi
    PYTHON_BIN="python3.12"
    # Nginx
    sudo apt install -y nginx
else
    error "Unsupported OS: $OS_ID. Install Node 20, Python 3.12, and Nginx manually."
    exit 1
fi

# PM2
if ! command -v pm2 &>/dev/null; then
    info "Installing PM2..."
    sudo npm install -g pm2
fi

# Docker (only if needed)
if [[ "$PYTHON_DEPLOY_MODE" == "docker" ]]; then
    if ! command -v docker &>/dev/null; then
        info "Installing Docker..."
        if [[ "$OS_ID" == "amzn" ]]; then
            sudo yum install -y docker
        else
            sudo apt install -y docker.io
        fi
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker "$(whoami)" || true
    fi
fi

info "Node $(node -v) | npm $(npm -v) | Python $($PYTHON_BIN --version) | PM2 $(pm2 -v)"

# ---------------------- CLONE REPO --------------------------
if [[ -n "$REPO_URL" ]]; then
    info "Cloning repository..."
    if [ -d "$APP_DIR" ]; then
        warn "$APP_DIR already exists — pulling latest..."
        cd "$APP_DIR" && git pull origin "$BRANCH"
    else
        git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    fi
else
    if [ ! -d "$APP_DIR" ]; then
        error "No REPO_URL set and $APP_DIR does not exist. Copy your code to $APP_DIR first."
        exit 1
    fi
    info "Using existing code at $APP_DIR"
fi

cd "$APP_DIR"

# ---------------------- STOP OLD PROCESSES ------------------
info "Stopping any existing PM2 processes..."
pm2 delete all 2>/dev/null || true

if [[ "$PYTHON_DEPLOY_MODE" == "docker" ]]; then
    docker rm -f ingestion stream-proc 2>/dev/null || true
fi

# ============================================================
#  SERVICE 1: analytics  (Node.js — port 3001)
# ============================================================
info "Setting up analytics service..."
cd "$APP_DIR/analytics"
npm ci --omit=dev

cat > .env <<EOF
PORT=3001
NODE_ENV=production
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_SSL=true
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN}
S3_REPORT_BUCKET=${S3_REPORT_BUCKET}
S3_PRESIGN_EXPIRES=3600
COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
CORS_ORIGINS=http://${DOMAIN},http://${DOMAIN}:3000
ENGINE_SECRET=${ENGINE_SECRET}
EOF

pm2 start server.js --name analytics
info "analytics started on port 3001 ✓"

# ============================================================
#  SERVICE 2: aiAnamolyDetection  (Node.js — port 3002)
# ============================================================
info "Setting up aiAnamolyDetection service..."
cd "$APP_DIR/aiAnamolyDetection"
npm ci --omit=dev

cat > .env <<EOF
PORT=3002
NODE_ENV=production
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_SSL=true
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=${OPENAI_MODEL}
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN}
COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
CORS_ORIGINS=http://${DOMAIN},http://${DOMAIN}:3000
ENGINE_SECRET=${ENGINE_SECRET}
EOF

pm2 start server.js --name anomaly-detection
info "aiAnamolyDetection started on port 3002 ✓"

# ============================================================
#  SERVICE 3: ingestion-service  (Python/FastAPI — port 8000)
# ============================================================
info "Setting up ingestion-service..."
cd "$APP_DIR/ingestion-service"

cat > .env <<EOF
PG_HOST=${DB_HOST}
PG_PORT=${DB_PORT}
PG_USER=${DB_USER}
PG_PASSWORD=${DB_PASSWORD}
PG_DATABASE=${DB_NAME}
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN}
DYNAMODB_TABLE_DEDUP=${DYNAMODB_TABLE_DEDUP}
KINESIS_STREAM_NAME=${KINESIS_STREAM_NAME}
S3_BUCKET=${S3_DATA_BUCKET}
S3_REJECTED_PREFIX=${S3_REJECTED_PREFIX}
LAMBDA_POST_INGEST=${LAMBDA_POST_INGEST}
EOF

if [[ "$PYTHON_DEPLOY_MODE" == "docker" ]]; then
    docker build -t ingestion-service .
    docker run -d --name ingestion \
        --env-file .env \
        -p 8000:8000 \
        --restart always \
        ingestion-service
else
    $PYTHON_BIN -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    pm2 start "cd $APP_DIR/ingestion-service && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000" \
        --name ingestion --interpreter bash
fi
info "ingestion-service started on port 8000 ✓"

# ============================================================
#  SERVICE 4: stream-processing-service  (Python/FastAPI — port 8001)
# ============================================================
info "Setting up stream-processing-service..."
cd "$APP_DIR/stream-processing-service"

cat > .env <<EOF
PG_HOST=${DB_HOST}
PG_PORT=${DB_PORT}
PG_USER=${DB_USER}
PG_PASSWORD=${DB_PASSWORD}
PG_DATABASE=${DB_NAME}
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN}
DYNAMODB_TABLE_DEDUP=${DYNAMODB_TABLE_DEDUP}
KINESIS_STREAM_NAME=${KINESIS_STREAM_NAME}
S3_BUCKET=${S3_DATA_BUCKET}
ANOMALY_ENGINE_URL=http://127.0.0.1:3002
EOF

if [[ "$PYTHON_DEPLOY_MODE" == "docker" ]]; then
    docker build -t stream-processing .
    docker run -d --name stream-proc \
        --env-file .env \
        --network host \
        --restart always \
        stream-processing
else
    $PYTHON_BIN -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    pm2 start "cd $APP_DIR/stream-processing-service && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8001" \
        --name stream-processing --interpreter bash
fi
info "stream-processing-service started on port 8001 ✓"

# ============================================================
#  SERVICE 5: anveshak  (Next.js — port 3000)
# ============================================================
info "Setting up anveshak (Next.js frontend)..."
cd "$APP_DIR/anveshak"
npm ci

cat > .env.local <<EOF
NEXT_PUBLIC_ANALYTICS_API_URL=http://${DOMAIN}:3001
NEXT_PUBLIC_ANOMALY_API_URL=http://${DOMAIN}:3002
NEXT_PUBLIC_ENGINE_SECRET=${ENGINE_SECRET}
NEXT_PUBLIC_AWS_REGION=${AWS_REGION}
NEXT_PUBLIC_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
NEXT_PUBLIC_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
NEXT_PUBLIC_S3_REPORT_BUCKET=${S3_REPORT_BUCKET}
NEXT_PUBLIC_USE_MOCK=false
EOF

info "Building Next.js production bundle (this may take a few minutes)..."
npm run build

pm2 start npm --name anveshak -- start
info "anveshak started on port 3000 ✓"

# ============================================================
#  NGINX REVERSE PROXY
# ============================================================
info "Configuring Nginx reverse proxy..."

sudo tee /etc/nginx/conf.d/anveshak.conf > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Analytics API
    location /api/analytics/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Anomaly Detection API
    location /api/anomaly/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Ingestion API
    location /api/ingest/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Stream Processing API
    location /api/stream/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX

# Remove default config that conflicts
sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

sudo nginx -t && sudo systemctl restart nginx && sudo systemctl enable nginx
info "Nginx configured ✓"

# ============================================================
#  PM2 STARTUP (survive reboots)
# ============================================================
info "Configuring PM2 startup..."
pm2 save
PM2_STARTUP_CMD=$(pm2 startup 2>&1 | grep "sudo" | head -1)
if [[ -n "$PM2_STARTUP_CMD" ]]; then
    eval "$PM2_STARTUP_CMD"
fi

# ============================================================
#  SUMMARY
# ============================================================
echo ""
echo "============================================================"
echo -e "${GREEN}  DEPLOYMENT COMPLETE${NC}"
echo "============================================================"
echo ""
echo "  Services running:"
echo "  ──────────────────────────────────────────────"
echo "  anveshak (frontend)     → http://${DOMAIN}:3000"
echo "  analytics               → http://${DOMAIN}:3001"
echo "  aiAnamolyDetection      → http://${DOMAIN}:3002"
echo "  ingestion-service       → http://${DOMAIN}:8000"
echo "  stream-processing       → http://${DOMAIN}:8001"
echo "  ──────────────────────────────────────────────"
echo "  Nginx (all via port 80) → http://${DOMAIN}"
echo ""
echo "  Useful commands:"
echo "    pm2 status          — see all processes"
echo "    pm2 logs <name>     — view logs"
echo "    pm2 restart all     — restart everything"
echo "    pm2 monit           — live dashboard"
echo ""
echo "  Security Group — ensure these inbound ports are open:"
echo "    22 (SSH), 80 (HTTP), 443 (HTTPS)"
echo "============================================================"
