# Stage 1: Build the application
FROM node:20-bookworm AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy config files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
ENV npm_config_build_from_source=true
ENV DATABASE_URL="file:./database.db"
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client and build project
RUN pnpm exec prisma generate && pnpm run build


# Stage 2: Production image
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# Create data directory for SQLite persistence
RUN mkdir -p /data
ENV DATABASE_URL="file:/data/database.db"

# Copy config and artifacts for production install
COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

# Install only production dependencies (hoisted)
RUN pnpm install --prod --frozen-lockfile

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["/bin/sh", "-c", "npx prisma db push && node dist/index.js"]
