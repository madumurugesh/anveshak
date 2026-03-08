# EC2 Deployment Guide — GitHub Actions + Nginx

This guide explains how to deploy all Anveshak services to an EC2 instance using the GitHub Actions workflow with Nginx virtual hosts.

---

## Architecture Overview

| Service | Type | Internal Port | Nginx Subdomain |
|---|---|---|---|
| **Frontend** (anveshak) | Next.js | 3000 | `yourdomain.com` |
| **Analytics API** | Node.js/Express | 3001 | `api-analytics.yourdomain.com` |
| **Anomaly Detection API** | Node.js/Express | 3002 | `api-anomaly.yourdomain.com` |
| **Ingestion Service** | Python/FastAPI | 8000 | `api-ingestion.yourdomain.com` |
| **Stream Processing** | Python/FastAPI | 8001 | `api-stream.yourdomain.com` |

All services run behind Nginx reverse proxy using subdomain-based virtual hosts on port 80.

---

## Prerequisites

### 1. EC2 Instance Setup

Launch an EC2 instance (Amazon Linux 2023 or Ubuntu 22.04) and install the required software. You can use the existing `deploy_ec2.sh` script for initial setup, or install manually:

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# PM2 (process manager)
sudo npm install -g pm2

# Python 3.12
sudo apt install -y python3.12 python3.12-venv python3.12-dev

# Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Git
sudo apt install -y git
```

### 2. PM2 Startup Script

Enable PM2 to restart services on EC2 reboot:

```bash
pm2 startup
# Run the command it outputs (starts with sudo env PATH=...)
```

### 3. Security Group

Open these inbound ports on the EC2 security group:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP (Nginx) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (optional, for SSL) |

> **Do NOT** expose ports 3000-3002, 8000-8001 directly. Nginx handles all external traffic on port 80.

### 4. DNS Records

Point these DNS records to your EC2 public IP:

| Record | Type | Value |
|--------|------|-------|
| `yourdomain.com` | A | `<EC2_PUBLIC_IP>` |
| `api-analytics.yourdomain.com` | A | `<EC2_PUBLIC_IP>` |
| `api-anomaly.yourdomain.com` | A | `<EC2_PUBLIC_IP>` |
| `api-ingestion.yourdomain.com` | A | `<EC2_PUBLIC_IP>` |
| `api-stream.yourdomain.com` | A | `<EC2_PUBLIC_IP>` |

Or use a wildcard: `*.yourdomain.com` → `<EC2_PUBLIC_IP>`

### 5. Environment Files

Each service reads its configuration from `.env` files. Create these on the EC2 instance **before** the first deployment:

```bash
# Create env files for each service
# (see deploy_ec2.sh for full list of variables)

sudo mkdir -p /home/ec2-user/app

# Example: analytics/.env
cat > /home/ec2-user/app/analytics/.env <<EOF
PORT=3001
NODE_ENV=production
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=postgres
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SSL=true
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=your-pool-id
CORS_ORIGINS=http://yourdomain.com
EOF
```

> **Important:** The workflow does NOT create `.env` files — you manage secrets on the server directly. This keeps sensitive values out of your Git repo.

---

## GitHub Secrets Configuration

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** and add these secrets:

| Secret | Description | Example |
|--------|-------------|---------|
| `EC2_HOST` | EC2 public IP or hostname | `54.123.45.67` |
| `EC2_USER` | SSH username | `ec2-user` (Amazon Linux) or `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key (PEM content) | Contents of your `.pem` file |
| `REPO_URL` | Git clone URL | `https://github.com/your-org/anveshak.git` |
| `DOMAIN` | Your domain name | `anveshak.example.com` |

### How to add `EC2_SSH_KEY`:

```bash
# Copy the contents of your .pem key file
cat ~/.ssh/your-ec2-key.pem
# Paste the ENTIRE output (including BEGIN/END lines) into the secret value
```

If your repo is private, use a deploy key or personal access token in the `REPO_URL`:

```
https://<GITHUB_TOKEN>@github.com/your-org/anveshak.git
```

---

## How to Deploy

### Automatic Deployment (on push)

Every push to the `main` branch automatically triggers a full deployment of all services.

### Manual Deployment (workflow_dispatch)

1. Go to your GitHub repo → **Actions** → **Deploy to EC2 via SSH**
2. Click **Run workflow**
3. Choose which services to deploy:
   - `all` — deploys everything (default)
   - Comma-separated list: `frontend,analytics` — deploys only those services

#### Service names for selective deployment:

| Name | Service |
|------|---------|
| `frontend` | Next.js app (anveshak) |
| `analytics` | Analytics API |
| `anomaly` | Anomaly Detection API |
| `ingestion` | Ingestion Service |
| `stream` | Stream Processing |

**Examples:**

```
# Deploy only the frontend
frontend

# Deploy frontend and analytics
frontend,analytics

# Deploy all Python services
ingestion,stream

# Deploy everything
all
```

---

## Nginx Virtual Hosts

The Nginx configs live in the `nginx/` directory at the repo root:

```
nginx/
├── anveshak-frontend.conf    → yourdomain.com         → :3000
├── anveshak-analytics.conf   → api-analytics.*         → :3001
├── anveshak-anomaly.conf     → api-anomaly.*           → :3002
├── anveshak-ingestion.conf   → api-ingestion.*         → :8000
└── anveshak-stream.conf      → api-stream.*            → :8001
```

Each config uses `__DOMAIN__` as a placeholder, which is replaced with the value of the `DOMAIN` secret during deployment.

### Customizing Nginx Configs

Edit the files in the `nginx/` directory and push to `main`. The workflow will automatically deploy the updated configs.

### Adding SSL (HTTPS)

After the first deployment, SSH into the EC2 and install Certbot:

```bash
# Ubuntu
sudo apt install -y certbot python3-certbot-nginx

# Get certificates for all subdomains
sudo certbot --nginx \
  -d yourdomain.com \
  -d api-analytics.yourdomain.com \
  -d api-anomaly.yourdomain.com \
  -d api-ingestion.yourdomain.com \
  -d api-stream.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically modify the Nginx configs to add SSL. Subsequent deployments will overwrite the configs, so you may want to add SSL directives directly to the `nginx/*.conf` files in the repo after running Certbot once.

---

## Monitoring & Troubleshooting

### Check service status

```bash
ssh ec2-user@your-ec2-ip

# PM2 process list
pm2 list

# Logs for a specific service
pm2 logs analytics
pm2 logs anveshak-frontend
pm2 logs anomaly-detection
pm2 logs ingestion-service
pm2 logs stream-processing

# Restart a service
pm2 restart analytics
```

### Check Nginx

```bash
# Test config validity
sudo nginx -t

# View active vhosts
ls -la /etc/nginx/conf.d/anveshak-*.conf

# Check Nginx error log
sudo tail -50 /var/log/nginx/error.log

# Reload after manual config changes
sudo systemctl reload nginx
```

### Health checks

```bash
curl http://127.0.0.1:3000          # Frontend
curl http://127.0.0.1:3001/health   # Analytics
curl http://127.0.0.1:3002/health   # Anomaly Detection
curl http://127.0.0.1:8000/health   # Ingestion
curl http://127.0.0.1:8001/health   # Stream Processing
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `502 Bad Gateway` | Service isn't running. Check `pm2 list` and `pm2 logs <name>` |
| `Connection refused` on health check | Service crashed. Check `pm2 logs <name>` for errors |
| Nginx config test fails | Check `sudo nginx -t` for syntax errors |
| SSH connection refused in workflow | Verify `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` secrets are correct |
| Git clone fails | Verify `REPO_URL` includes auth token if repo is private |
| Python venv errors | Delete `venv/` folder and re-deploy: `rm -rf /home/ec2-user/app/ingestion-service/venv` |

---

## Workflow File Reference

The workflow file is at `.github/workflows/deploy-ec2.yml`. It performs these steps:

1. **Checkout** — clones the repo in the GitHub runner
2. **SCP** — copies `nginx/*.conf` files to the EC2 instance
3. **SSH** — connects to EC2 and:
   - Pulls latest code from git
   - Installs dependencies for selected services
   - Restarts services via PM2
   - Deploys Nginx vhost configs with domain substitution
   - Runs `nginx -t` and reloads Nginx
   - Performs health checks on all services

---

## IP-Based Setup (No Domain)

If you don't have a domain and want to use the EC2 public IP directly, you can use path-based routing instead of subdomain-based vhosts.

Replace all 5 Nginx configs with a single `nginx/anveshak-all.conf`:

```nginx
server {
    listen 80;
    server_name __DOMAIN__;

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
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Anomaly Detection API
    location /api/anomaly/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Ingestion Service
    location /api/ingestion/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Stream Processing
    location /api/stream/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Set the `DOMAIN` secret to `_` (underscore) to act as a catch-all server.
