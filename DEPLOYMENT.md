# LISA AI Assistant - Deployment Guide

## 🚀 Production Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Prerequisites
- Docker and Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)

#### Quick Deploy
```bash
# Clone the repository
git clone <your-repo-url>
cd LISA

# Copy and configure environment variables
cp .env.production .env
# Edit .env with your actual values

# Build and start the application
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs lisa-app
```

#### Production Docker Compose
```bash
# Use production configuration
docker-compose -f docker-compose.yml up -d
```

### Option 2: Cloud Platform Deployment

#### Deploy to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

#### Deploy to Heroku
```bash
# Install Heroku CLI and login
heroku create your-lisa-app

# Set environment variables
heroku config:set GEMINI_API_KEY=your_key
heroku config:set JWT_SECRET=your_secret
# ... add all required environment variables

# Deploy
git push heroku main
```

#### Deploy to Vercel (Frontend + API)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Deploy to AWS ECS
```bash
# Build and push image
docker build -t lisa-ai .
docker tag lisa-ai:latest your-account.dkr.ecr.region.amazonaws.com/lisa-ai:latest
docker push your-account.dkr.ecr.region.amazonaws.com/lisa-ai:latest

# Use provided ECS task definition
```

## 🔧 Configuration

### Required Environment Variables
```bash
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Authentication
JWT_SECRET=your_256_bit_jwt_secret

# Database (Production PostgreSQL recommended)
DATABASE_URL=postgresql://user:pass@host:5432/lisa_prod

# Firebase (for social auth)
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

### Security Configuration
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
SECURE_COOKIES=true
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗄️ Database Setup

### PostgreSQL (Recommended for Production)
```bash
# Create database
createdb lisa_production

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### SQLite (Development/Small Scale)
```bash
# Migrations run automatically
# Database file created at: ./data/prod.db
```

## 🔒 SSL/HTTPS Setup

### Using Caddy (Recommended)
```caddyfile
yourdomain.com {
    reverse_proxy localhost:5000
    encode gzip
    
    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
    }
}
```

### Using Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints
```bash
# Application health
curl https://yourdomain.com/api/health

# Response example
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123,
  "database": { "status": "healthy" }
}
```

### Docker Health Check
```bash
# Check container health
docker ps
docker logs lisa-app

# Manual health check
docker exec lisa-app curl http://localhost:5000/api/health
```

## 🔄 CI/CD Pipeline

### GitHub Actions (Included)
- ✅ Automated testing on push/PR
- ✅ Docker image building
- ✅ Container registry publishing
- ✅ Production deployment

### Manual Deployment
```bash
# Build and test locally
yarn install
yarn test
yarn build

# Build Docker image
docker build -t lisa-ai .

# Push to registry
docker tag lisa-ai your-registry/lisa-ai:latest
docker push your-registry/lisa-ai:latest
```

## 🛠️ Maintenance

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild container
docker-compose down
docker-compose up -d --build

# Run database migrations if needed
docker-compose exec lisa-app npx prisma migrate deploy
```

### Backup Database
```bash
# PostgreSQL backup
pg_dump lisa_production > backup_$(date +%Y%m%d_%H%M%S).sql

# SQLite backup
cp ./data/prod.db ./backups/backup_$(date +%Y%m%d_%H%M%S).db
```

### View Logs
```bash
# Docker logs
docker-compose logs -f lisa-app

# Application logs
tail -f /app/logs/lisa.log
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :5000
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec lisa-app npx prisma migrate status
```

#### Memory Issues
```bash
# Increase Docker memory limits
docker-compose down
# Edit docker-compose.yml to add memory limits
docker-compose up -d
```

### Performance Optimization
- Enable Redis caching
- Configure CDN for static assets
- Implement database connection pooling
- Enable gzip compression
- Monitor resource usage

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale application instances
docker-compose up -d --scale lisa-app=3

# Use load balancer (nginx/traefik)
```

### Database Scaling
- Read replicas for PostgreSQL
- Connection pooling with PgBouncer
- Database partitioning for large datasets

## 🔐 Security Checklist

- ✅ HTTPS enabled with valid SSL certificate
- ✅ Environment variables secured
- ✅ Database access restricted
- ✅ Rate limiting configured
- ✅ Security headers implemented
- ✅ Dependencies regularly updated
- ✅ Error logging without sensitive data
- ✅ CORS properly configured

## 📞 Support

For deployment issues:
1. Check the health check endpoint
2. Review application logs
3. Verify environment configuration
4. Check database connectivity
5. Monitor resource usage

---

**🎉 Your LISA AI Assistant is now ready for production deployment!**