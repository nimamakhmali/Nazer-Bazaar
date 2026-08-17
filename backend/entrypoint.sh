#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
while ! nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 0.5
done
echo "✅ PostgreSQL is up"

echo "⏳ Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
while ! nc -z "$REDIS_HOST" "$REDIS_PORT"; do
  sleep 0.5
done
echo "✅ Redis is up"

case "$SERVICE_ROLE" in

  web)
    echo "📦 Running migrations..."
    python manage.py migrate --noinput

    echo "🗂  Collecting static files..."
    python manage.py collectstatic --noinput

    # ساخت خودکار سوپریوزر در صورت تنظیم بودن متغیرها (اختیاری)
    if [ -n "$DJANGO_SUPERUSER_PHONE_NUMBER" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
      echo "👤 Ensuring superuser exists..."
      python manage.py createsuperuser --noinput || true
    fi

    echo "🚀 Starting Gunicorn..."
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
    ;;

  worker)
    echo "🚀 Starting Celery worker..."
    exec celery -A config worker -l info
    ;;

  beat)
    echo "🚀 Starting Celery beat..."
    exec celery -A config beat -l info \
        --scheduler django_celery_beat.schedulers:DatabaseScheduler
    ;;

  *)
    echo "❌ Unknown SERVICE_ROLE: $SERVICE_ROLE"
    exec "$@"
    ;;
esac