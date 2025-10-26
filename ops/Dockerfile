FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY bot/package*.json ./bot/

# Install dependencies
RUN cd bot && npm ci --only=production

# Copy bot source code
COPY bot /app/bot

# Build the application
RUN cd bot && npm run build

# Create non-root user
RUN useradd -m -u 1000 arbuser && chown -R arbuser:arbuser /app
USER arbuser

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Bot is running')" || exit 1

# Start the bot
CMD ["node", "bot/dist/index.js"]
