# NanoClaw Railway Dockerfile
# Runs NanoClaw with Telegram in process mode (no nested containers needed)

FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI (needed by agent-runner in process mode)
RUN npm install -g @anthropic-ai/claude-code@latest

# Copy host package files
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Copy agent-runner package files and install
COPY container/agent-runner/package.json container/agent-runner/package-lock.json ./container/agent-runner/
RUN cd container/agent-runner && npm ci --production=false

# Copy all source
COPY . .

# Build host TypeScript
RUN npm run build

# Build agent-runner TypeScript
RUN cd container/agent-runner && npx tsc

# Create persistent data directories (Railway volume mounts to /data)
RUN mkdir -p /data/store /data/groups /data/data

# Environment defaults for Railway
ENV PROCESS_MODE=true
ENV TELEGRAM_ONLY=true
ENV NANOCLAW_STORE_DIR=/data/store
ENV NANOCLAW_GROUPS_DIR=/data/groups
ENV NANOCLAW_DATA_DIR=/data/data
ENV NODE_ENV=production

# Start NanoClaw
CMD ["node", "dist/index.js"]
