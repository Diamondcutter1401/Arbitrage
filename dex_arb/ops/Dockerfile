FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY pybot /app/pybot
COPY config /app/config

# Create non-root user
RUN useradd -m -u 1000 arbuser && chown -R arbuser:arbuser /app
USER arbuser

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import pybot.cfg; print('Health check passed')" || exit 1

# Default command
CMD ["python", "-m", "pybot.main"]
