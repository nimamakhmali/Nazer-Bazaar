# ─────────────────────────────────────────────────────────────
# فایل: backend/Dockerfile
# با پشتیبانی از میرور ایرانی برای apt و pip
# ─────────────────────────────────────────────────────────────

FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ─── تنظیم میرور ایرانی برای apt ─────────────────────────────
# در صورتی که دانلود مستقیم ممکن نبود این خطوط را uncomment کن
# RUN sed -i 's|http://deb.debian.org|http://mirror.arvancloud.ir|g' /etc/apt/sources.list.d/debian.sources

# ─── System Dependencies ─────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    libcairo2 \
    shared-mime-info \
    gettext \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# ─── نصب Python packages با میرور ایرانی ─────────────────────
COPY requirements.txt .

# ابتدا بدون میرور امتحان کن، اگر نشد خط زیر را uncomment کن:
# RUN pip install --no-cache-dir --upgrade pip -i https://mirror.arvancloud.ir/pypi/simple/ && \
#     pip install --no-cache-dir -r requirements.txt -i https://mirror.arvancloud.ir/pypi/simple/

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─── Copy project ─────────────────────────────────────────────
COPY . .

# ─── Create necessary directories ────────────────────────────
RUN mkdir -p /app/staticfiles /app/media /app/logs

# ─── Entrypoint ───────────────────────────────────────────────
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]