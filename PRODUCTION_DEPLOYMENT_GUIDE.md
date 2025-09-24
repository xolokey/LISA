# 🚀 LISA AI Assistant - Production Deployment Guide

**Version**: 1.0.0  
**Last Updated**: 2025-09-24  
**Environment**: Production Ready

---

## 📋 Pre-Deployment Checklist

### ✅ **Infrastructure Requirements**
- [ ] **Server**: Minimum 2 CPU cores, 4GB RAM, 20GB SSD
- [ ] **Database**: PostgreSQL 14+ with backup configuration
- [ ] **Domain**: SSL certificate and DNS configuration
- [ ] **API Keys**: Gemini AI, Firebase, SMTP credentials
- [ ] **Monitoring**: Error tracking and uptime monitoring

### ✅ **Security Checklist**
- [ ] All environment variables secured
- [ ] SSL certificate installed and configured
- [ ] Firewall rules configured (ports 80, 443, 22 only)
- [ ] Database connections encrypted
- [ ] Regular security updates scheduled

---

## 🛠️ Deployment Options

## Option 1: Docker Deployment (Recommended)

### **Step 1: Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### **Step 2: Clone and Configure**
```bash
# Clone repository
git clone https://github.com/your-org/lisa-ai-assistant.git
cd lisa-ai-assistant

# Create production environment file
cp .env.production.template .env.production

# Edit environment variables
nano .env.production
```

### **Step 3: Deploy with Docker Compose**
```bash
# Build and start services
docker-compose -f docker-compose.yml up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### **Step 4: Database Setup**
```bash
# Run database migrations
docker-compose exec lisa-app npx prisma migrate deploy

# Seed initial data (optional)
docker-compose exec lisa-app npx prisma db seed
```

### **Step 5: Verify Deployment**
```bash
# Health check
curl https://your-domain.com/api/health

# Expected response:
# {"status":"healthy","uptime":300,"database":{"status":"healthy"}}
```

---

## Option 2: Traditional Server Deployment

### **Step 1: Install Dependencies**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

### **Step 2: Database Configuration**
```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE lisa_production;
CREATE USER lisa_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE lisa_production TO lisa_user;
\q

# Update connection string in .env.production
DATABASE_URL="postgresql://lisa_user:secure_password@localhost:5432/lisa_production"
```

### **Step 3: Application Setup**
```bash
# Clone and build application
git clone https://github.com/your-org/lisa-ai-assistant.git
cd lisa-ai-assistant

# Install dependencies
npm install --production

# Build application
npm run build

# Run database migrations
npx prisma migrate deploy
```

### **Step 4: PM2 Configuration**
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'lisa-backend',
      script: 'server/index.cjs',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'lisa-frontend',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### **Step 5: Nginx Configuration**
```bash
# Create Nginx configuration
sudo cat > /etc/nginx/sites-available/lisa << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # File uploads
    client_max_body_size 10M;
}
EOF

# Enable site and reload Nginx
sudo ln -s /etc/nginx/sites-available/lisa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Option 3: Cloud Platform Deployment

### **Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### **Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### **Heroku**
```bash
# Install Heroku CLI and deploy
heroku create lisa-ai-assistant
git push heroku main
```

### **DigitalOcean App Platform**
```yaml
# app.yaml
name: lisa-ai-assistant
services:
- name: web
  source_dir: /
  github:
    repo: your-org/lisa-ai-assistant
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
```

---

## 🔧 Environment Configuration

### **Required Environment Variables**
```bash
# Core Settings
NODE_ENV=production
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_256_bit_secret

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Firebase (Social Auth)
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

### **Optional but Recommended**
```bash
# Monitoring
SENTRY_DSN=your_sentry_dsn
GA_TRACKING_ID=your_ga_id

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email
SMTP_PASS=your_app_password
```

---

## 🗄️ Database Migrations

### **Production Migration Process**
```bash
# 1. Backup current database
pg_dump -h localhost -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations
npx prisma migrate deploy

# 3. Verify migration status
npx prisma migrate status

# 4. Seed data (if needed)
npx prisma db seed
```

### **Rollback Process**
```bash
# If migration fails, restore from backup
psql -h localhost -U username -d database_name < backup_20250924_120000.sql
```

---

## 📊 Monitoring & Health Checks

### **Health Check Endpoints**
```bash
# Application health
curl https://your-domain.com/api/health

# Database health
curl https://your-domain.com/api/health/db

# Detailed system status
curl https://your-domain.com/api/status
```

### **Log Locations**
```bash
# Docker deployment
docker-compose logs -f lisa-app

# PM2 deployment
pm2 logs lisa-backend
pm2 logs lisa-frontend

# System logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Monitoring Setup**
```bash
# Install monitoring agent (optional)
# For DataDog
DD_API_KEY=your_datadog_key bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# For New Relic
curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash
sudo NEW_RELIC_API_KEY=your_key NEW_RELIC_ACCOUNT_ID=your_id /usr/local/bin/newrelic install
```

---

## 🔒 Security Hardening

### **SSL Certificate Setup**
```bash
# Using Let's Encrypt (Certbot)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot renew --dry-run
```

### **Firewall Configuration**
```bash
# UFW (Ubuntu Firewall)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

### **Database Security**
```bash
# PostgreSQL security
sudo -u postgres psql

# Create read-only backup user
CREATE USER backup_user WITH PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE lisa_production TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

---

## 🔄 Backup & Recovery

### **Automated Backup Script**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/app/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/db_backup_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /app/lisa-ai-assistant

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### **Restore Process**
```bash
# Restore database
psql $DATABASE_URL < /app/backups/db_backup_20250924_120000.sql

# Restore application
tar -xzf /app/backups/app_backup_20250924_120000.tar.gz -C /
```

---

## ⚡ Performance Optimization

### **CDN Setup (Optional)**
```bash
# Using Cloudflare
# 1. Update DNS to point to Cloudflare
# 2. Enable caching rules for static assets
# 3. Configure SSL/TLS mode to "Full (strict)"
```

### **Database Optimization**
```sql
-- PostgreSQL performance tuning
-- Add these to postgresql.conf

shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

---

## 🚨 Troubleshooting

### **Common Issues**

#### **Application Won't Start**
```bash
# Check logs
docker-compose logs lisa-app
# or
pm2 logs lisa-backend

# Check port conflicts
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5000
```

#### **Database Connection Issues**
```bash
# Test database connection
psql $DATABASE_URL

# Check PostgreSQL status
sudo systemctl status postgresql
```

#### **SSL Certificate Issues**
```bash
# Check certificate expiry
openssl x509 -in /path/to/cert.pem -noout -dates

# Renew Let's Encrypt certificate
sudo certbot renew
```

#### **High Memory Usage**
```bash
# Monitor system resources
htop
docker stats

# Restart services if needed
docker-compose restart
# or
pm2 restart all
```

---

## 📝 Post-Deployment Checklist

### **Immediate Verification**
- [ ] Application loads at https://your-domain.com
- [ ] Health check endpoint returns 200 OK
- [ ] Database migrations completed successfully
- [ ] SSL certificate valid and HTTPS redirect working
- [ ] User registration and login working
- [ ] AI chat functionality operational

### **24-Hour Monitoring**
- [ ] Check error logs for any issues
- [ ] Monitor memory and CPU usage
- [ ] Verify backup script executed successfully
- [ ] Test all major features end-to-end
- [ ] Monitor response times and performance

### **Weekly Maintenance**
- [ ] Review security logs
- [ ] Update dependencies (security patches)
- [ ] Check disk space usage
- [ ] Verify backup integrity
- [ ] Monitor user feedback and error rates

---

## 📞 Support & Maintenance

### **Emergency Contacts**
- **DevOps Team**: devops@your-company.com
- **Security Team**: security@your-company.com
- **On-Call Engineer**: +1-xxx-xxx-xxxx

### **Maintenance Windows**
- **Scheduled**: Sundays 2:00 AM - 4:00 AM UTC
- **Emergency**: As needed with 1-hour notice

### **Rollback Procedure**
```bash
# Quick rollback to previous version
docker-compose down
git checkout previous-stable-tag
docker-compose up -d

# Restore database if needed
psql $DATABASE_URL < /app/backups/latest_backup.sql
```

---

**Deployment Status**: ✅ READY FOR PRODUCTION  
**Last Tested**: 2025-09-24  
**Next Review**: 2025-10-24