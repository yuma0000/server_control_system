# =========================================================
# Universal Node.js Multi-Stage Dockerfile
# Works on Render, Fly.io, GCP Cloud Run, AWS, Railway, VPS
# =========================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json bun.lock* ./

# Install all dependencies (including devDependencies for esbuild & vite)
RUN npm ci || npm install

# Copy source code
COPY . .

# Build both client (Vite static bundle) and server (esbuild dist/server.cjs)
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV SERVE_STATIC=false
ENV DATA_DIR=/app/data

# Copy package files for production dependency install
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production || npm install --only=production

# Copy built server bundle & static dist from builder stage
COPY --from=builder /app/dist ./dist

# Create persistent data directory
RUN mkdir -p /app/data

EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/status || exit 1

# Start standalone server
CMD ["node", "dist/server.cjs"]
