FROM python:3.11-slim

WORKDIR /app

# Install dependencies (no curl needed — healthcheck uses Python)
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 120 -r requirements.txt

# Copy application code
COPY . .

# Copy and prepare entrypoint
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Create a non-root user and set permissions
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/local_storage && \
    chown -R appuser:appuser /app

USER appuser

# Healthcheck using Python stdlib (no curl dependency)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Entrypoint handles DB wait + migrations, then runs CMD
ENTRYPOINT ["./entrypoint.sh"]
CMD uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers ${UVICORN_WORKERS:-4}
