FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh \
    && useradd --create-home appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# All secrets/config (OPENWEATHER_API_KEY, DATABASE_URL, CORS_ORIGINS,
# CONDITIONS_TIMEOUT_SECONDS) are read from the environment at runtime by
# app/config.py -- nothing is baked into this image. .dockerignore excludes
# .env, so a local .env file can never be copied in by `COPY . .` above.
# Set real values with `docker run -e KEY=value ...` or your platform's
# environment variable / secrets settings.
CMD ["./entrypoint.sh"]
