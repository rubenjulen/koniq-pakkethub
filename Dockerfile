# ---- PakketHub — productie/staging image (Next.js standalone) --------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prebuild genereert schema-sql.ts; build maakt de standalone output.
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Poort + host voor de standalone server.
ENV PORT=3070
ENV HOSTNAME=0.0.0.0
# Persistente map voor de ingebedde demo-database (mount hier een volume).
ENV PGLITE_DIR=/data/pgdata

# Niet als root draaien.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs \
    && mkdir -p /data/pgdata && chown -R nextjs:nodejs /data

# Standalone server + assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3070
CMD ["node", "server.js"]
