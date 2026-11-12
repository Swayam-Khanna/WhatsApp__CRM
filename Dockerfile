# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* .npmrc* ./
COPY scripts* ./scripts/
RUN npm ci --legacy-peer-deps

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetry disable & enable standalone build
ENV NEXT_TELEMETRY_DISABLED 1
ENV DOCKER_BUILD true

# Build arguments for client-side variables (injected by Coolify)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
ARG VITE_API_BASE_URL
ARG VITE_WS_URL

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=$NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build the project (leverages output: "standalone")
RUN npm run build

# Stage 3: Production server
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permissions for nextjs user
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Coolify / Docker Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
