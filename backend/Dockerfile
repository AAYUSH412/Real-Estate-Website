FROM node:18-slim

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies for a smaller runtime image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy application files after deps to preserve layer cache.
COPY --chown=node:node . .

USER node

EXPOSE 4000

CMD ["node", "server.js"]