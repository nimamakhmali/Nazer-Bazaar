#!/bin/bash
# ─────────────────────────────────────────────────────────────
# فایل: backend/entrypoint.sh
# ─────────────────────────────────────────────────────────────
set -e

# رنگ‌ها برای خوانایی لاگ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"; exit 1; }

# ─── انتظار برای PostgreSQL ───────────────────────────────────
log "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
RETRIES=30
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -eq 0 ]; then
        error "PostgreSQL is not available after 30 retries"
    fi
    sleep 1
done
log "✅ PostgreSQL is ready"

# ─── انتظار برای Redis ───────────────────────────────────────
log "⏳ Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
RETRIES=30
until nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -eq 0 ]; then
        error "Redis is not available after 30 retries"
    fi
    sleep 1
done
log "✅ Redis is ready"

# ─── اجرا بر اساس نقش ────────────────────────────────────────
case "$SERVICE_ROLE" in

  web)
    log "📦 Running database migrations..."
    python manage.py migrate --noinput

    log "🗂  Collecting static files..."
    python manage.py collectstatic --noinput --clear

    # ساخت superuser اگر تعریف شده
    if [ -n "$DJANGO_SUPERUSER_PHONE_NUMBER" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
        log "👤 Creating/verifying superuser..."
        python manage.py shell -c "
from apps.accounts.models import User
phone = '${DJANGO_SUPERUSER_PHONE_NUMBER}'
password = '${DJANGO_SUPERUSER_PASSWORD}'
if not User.objects.filter(phone_number=phone).exists():
    user = User.objects.create_superuser(
        phone_number=phone,
        password=password
    )
    print(f'Superuser created: {phone}')
else:
    print(f'Superuser already exists: {phone}')
" 2>&1 || warn "Could not create superuser (check your User model)"
    fi

    log "🚀 Starting Gunicorn (workers=3, port=8000)..."
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --worker-class sync \
        --timeout 120 \
        --keep-alive 5 \
        --max-requests 1000 \
        --max-requests-jitter 100 \
        --access-logfile - \
        --error-logfile - \
        --log-level info
    ;;

  worker)
    log "🚀 Starting Celery worker..."
    exec celery -A config worker \
        --loglevel=info \
        --concurrency=2 \
        --max-tasks-per-child=100
    ;;

  beat)
    log "🚀 Starting Celery beat..."
    exec celery -A config beat \
        --loglevel=info \
        --scheduler django_celery_beat.schedulers:DatabaseScheduler \
        --pidfile=/tmp/celerybeat.pid
    ;;

  *)
    warn "Unknown SERVICE_ROLE: '${SERVICE_ROLE}', executing command directly"
    exec "$@"
    ;;
esac