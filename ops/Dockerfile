FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY bot/package.json ./bot/

# Install dependencies (use npm install since lockfile may not be present)
RUN cd bot && npm install --omit=dev

# Copy bot source code
COPY bot /app/bot

# Build the application
RUN cd bot && npm run build

# Use the existing non-root user from the Node image
# node:20-slim has a pre-created 'node' user (typically uid 1000) to avoid uid conflicts
RUN chown -R node:node /app
USER node

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Bot is running')" || exit 1

# Start the bot
CMD ["node", "bot/dist/index.js"]
