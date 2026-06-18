FROM python:3.12-slim

# ─── System Dependencies ─────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    gettext \
    && rm -rf /var/lib/apt/lists/*

# ─── Work Directory ──────────────────────────────────────────────────────────
WORKDIR /app

# ─── Python Dependencies ─────────────────────────────────────────────────────
COPY requirements/ requirements/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements/production.txt

# ─── Project Files ───────────────────────────────────────────────────────────
COPY . .

# ─── Static Files ────────────────────────────────────────────────────────────
RUN python manage.py collectstatic --noinput

# ─── User (Security) ─────────────────────────────────────────────────────────
RUN adduser --disabled-password --gecos '' appuser
USER appuser

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--timeout", "120"]

     