#!/bin/bash
set -e

# ============================================================
#  Per-Service EC2 Deployer
#  Deploys a SINGLE service on its own EC2 instance
#
#  Usage:
#    chmod +x deploy_service.sh
#    sudo ./deploy_service.sh <service-name>
#
#  Service names:
#    anveshak | analytics | anomaly | ingestion | stream
# ============================================================

SERVICE="$1"

if [[ -z "$SERVICE" ]]; then
    echo "Usage: sudo ./deploy_service.sh <service-name>"
    echo ""
    echo "Available services:"
    echo "  anveshak    — Next.js frontend        (port 3000)"
    echo "  analytics   — Analytics API            (port 3001)"
    echo "  anomaly     — Anomaly Detection API    (port 3002)"
    echo "  ingestion   — Ingestion Service        (port 8000)"
    echo "  stream      — Stream Processing        (port 8001)"
    exit 1
fi

# ---------------------- CONFIGURATION -----------------------
# >>> EDIT THESE VALUES BEFORE RUNNING <<<

APP_DIR="/home/ec2-user/app"
REPO_URL=""                          # your git repo URL
BRANCH="main"

# Database (RDS — shared by all services)
DB_HOST=""
DB_PORT="5432"
DB_NAME="postgres"
DB_USER=""
DB_PASSWORD=""

# AWS
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_SESSION_TOKEN=""

# Cognito
COGNITO_USER_POOL_ID="us-east-1_aB19Y5peT"
COGNITO_CLIENT_ID="2nprgmun53mehvg5bnqjkqmo8k"

# OpenAI (only needed for anomaly service)
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"

# S3
S3_REPORT_BUCKET="anveshak-reports"
S3_DATA_BUCKET="anveshak-data"

# Secrets
ENGINE_SECRET=""

# ──── PRIVATE IPs OF OTHER EC2 INSTANCES ────
# Fill these in with the private IPs of each EC2.
# Used so services can communicate with each other.
ANALYTICS_HOST=""           # e.g. 10.0.1.10
ANOMALY_HOST=""             # e.g. 10.0.1.11
INGESTION_HOST=""           # e.g. 10.0.1.12
STREAM_HOST=""              # e.g. 10.0.1.13
FRONTEND_HOST=""            # e.g. 10.0.1.14

# Public IP (auto-detected from EC2 metadata)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")

# DynamoDB / Kinesis / Lambda (for Python services)
DYNAMODB_TABLE_DEDUP="anveshak-response-dedup"
KINESIS_STREAM_NAME="anveshak-ivr-responses"
S3_REJECTED_PREFIX="rejected-responses/"
LAMBDA_POST_INGEST="anveshak-post-ingest-trigger"

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

# ---------------------- INSTALL NODE.JS ---------------------
install_node() {
    if command -v node &>/dev/null; then
        info "Node.js already installed: $(node -v)"
        return
    fi
    info "Installing Node.js 20..."
    if [[ "$OS_ID" == "amzn" || "$OS_ID" == "rhel" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
        sudo apt install -y nodejs
    fi
    sudo npm install -g pm2
}

# ---------------------- INSTALL PYTHON ----------------------
install_python() {
    if command -v python3.12 &>/dev/null; then
        info "Python already installed: $(python3.12 --version)"
    else
        info "Installing Python 3.12..."
        if [[ "$OS_ID" == "amzn" || "$OS_ID" == "rhel" ]]; then
            sudo yum install -y python3.12 python3.12-pip python3.12-devel
        else
            sudo apt install -y python3.12 python3.12-venv python3.12-dev python3-pip
        fi
    fi
    if ! command -v pm2 &>/dev/null; then
        install_node  # PM2 needs Node
    fi
}

# ---------------------- INSTALL NGINX -----------------------
install_nginx() {
    if command -v nginx &>/dev/null; then
        info "Nginx already installed"
        return
    fi
    info "Installing Nginx..."
    if [[ "$OS_ID" == "amzn" || "$OS_ID" == "rhel" ]]; then
        sudo yum install -y nginx
    else
        sudo apt install -y nginx
    fi
    sudo systemctl enable nginx
}

# ---------------------- SYSTEM UPDATE -----------------------
info "Updating system packages..."
if [[ "$OS_ID" == "amzn" || "$OS_ID" == "rhel" ]]; then
    sudo yum update -y
    sudo yum install -y git curl gcc-c++ make
else
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential
fi

# ---------------------- CLONE REPO --------------------------
if [[ -n "$REPO_URL" ]]; then
    if [ -d "$APP_DIR" ]; then
        cd "$APP_DIR" && git pull origin "$BRANCH"
    else
        git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    fi
else
    if [ ! -d "$APP_DIR" ]; then
        error "No REPO_URL and $APP_DIR doesn't exist. Copy code there first."
        exit 1
    fi
fi

# ---------------------- STOP OLD PROCESSES ------------------
pm2 delete all 2>/dev/null || true

# ============================================================
#  DEPLOY FUNCTIONS
# ============================================================

deploy_analytics() {
    install_node
    install_nginx
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
CORS_ORIGINS=http://${FRONTEND_HOST}:3000,http://${PUBLIC_IP}:3000
ENGINE_SECRET=${ENGINE_SECRET}
EOF

    pm2 start server.js --name analytics
    setup_nginx 3001
    info "analytics deployed on port 3001 ✓"
}

deploy_anomaly() {
    install_node
    install_nginx
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
CORS_ORIGINS=http://${FRONTEND_HOST}:3000,http://${PUBLIC_IP}:3000
ENGINE_SECRET=${ENGINE_SECRET}
EOF

    pm2 start server.js --name anomaly-detection
    setup_nginx 3002
    info "aiAnamolyDetection deployed on port 3002 ✓"
}

deploy_ingestion() {
    install_python
    install_nginx
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

    python3.12 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate

    pm2 start "cd $APP_DIR/ingestion-service && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000" \
        --name ingestion --interpreter bash
    setup_nginx 8000
    info "ingestion-service deployed on port 8000 ✓"
}

deploy_stream() {
    install_python
    install_nginx
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
ANOMALY_ENGINE_URL=http://${ANOMALY_HOST}:3002
EOF

    python3.12 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate

    pm2 start "cd $APP_DIR/stream-processing-service && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8001" \
        --name stream-processing --interpreter bash
    setup_nginx 8001
    info "stream-processing-service deployed on port 8001 ✓"
}

deploy_anveshak() {
    install_node
    install_nginx
    cd "$APP_DIR/anveshak"
    npm ci

    # Use private IPs if set, otherwise fall back to public IPs
    ANALYTICS_URL="http://${ANALYTICS_HOST:-$PUBLIC_IP}:3001"
    ANOMALY_URL="http://${ANOMALY_HOST:-$PUBLIC_IP}:3002"

    cat > .env.local <<EOF
NEXT_PUBLIC_ANALYTICS_API_URL=${ANALYTICS_URL}
NEXT_PUBLIC_ANOMALY_API_URL=${ANOMALY_URL}
NEXT_PUBLIC_ENGINE_SECRET=${ENGINE_SECRET}
NEXT_PUBLIC_AWS_REGION=${AWS_REGION}
NEXT_PUBLIC_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
NEXT_PUBLIC_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
NEXT_PUBLIC_S3_REPORT_BUCKET=${S3_REPORT_BUCKET}
NEXT_PUBLIC_USE_MOCK=false
EOF

    info "Building Next.js (may take a few minutes)..."
    npm run build

    pm2 start npm --name anveshak -- start
    setup_nginx 3000
    info "anveshak deployed on port 3000 ✓"
}

# ---------------------- NGINX HELPER ------------------------
setup_nginx() {
    local PORT=$1
    sudo tee /etc/nginx/conf.d/service.conf > /dev/null <<NGINX
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX
    sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    sudo nginx -t && sudo systemctl restart nginx
}

# ============================================================
#  DISPATCH
# ============================================================
case "$SERVICE" in
    analytics)  deploy_analytics ;;
    anomaly)    deploy_anomaly ;;
    ingestion)  deploy_ingestion ;;
    stream)     deploy_stream ;;
    anveshak)   deploy_anveshak ;;
    *)
        error "Unknown service: $SERVICE"
        echo "Valid: anveshak | analytics | anomaly | ingestion | stream"
        exit 1
        ;;
esac

# ---------------------- PM2 STARTUP -------------------------
pm2 save
PM2_STARTUP_CMD=$(pm2 startup 2>&1 | grep "sudo" | head -1)
if [[ -n "$PM2_STARTUP_CMD" ]]; then
    eval "$PM2_STARTUP_CMD"
fi

echo ""
echo "============================================================"
echo -e "${GREEN}  ${SERVICE} DEPLOYED SUCCESSFULLY${NC}"
echo "  Access: http://${PUBLIC_IP} (via Nginx on port 80)"
echo "  PM2:   pm2 status | pm2 logs ${SERVICE}"
echo "============================================================"
