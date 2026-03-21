FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV RATE_LIMIT_STORE_PATH=/tmp/.rate-limit-store

# Install only production dependencies for a smaller runtime image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && mkdir -p /tmp/.rate-limit-store

# Copy application files after deps to preserve layer cache.
COPY --chown=node:node . .

USER node

EXPOSE 4000

CMD ["node", "server.js"]