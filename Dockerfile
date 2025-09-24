# Multi-stage Docker build for LISA AI Assistant
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
RUN yarn build

# Stage 2: Setup backend and runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install production dependencies
RUN yarn install --frozen-lockfile --production

# Copy backend source
COPY server/ ./server/
COPY prisma/ ./prisma/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./dist

# Copy environment example
COPY .env.example ./.env

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lisa -u 1001

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads && \
    chown -R lisa:nodejs /app

# Switch to non-root user
USER lisa

# Expose ports
EXPOSE 3000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Start the application
CMD ["yarn", "start"]