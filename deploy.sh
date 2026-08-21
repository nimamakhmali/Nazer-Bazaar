#!/bin/bash
# ─────────────────────────────────────────────────────────────
# فایل: deploy.sh
# اسکریپت دیپلوی سامانه پایش قیمت کالا
# اجرا: bash deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
info()    { echo -e "${BLUE}[→]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section() { echo -e "\n${BLUE}══════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════${NC}"; }

PROJECT_DIR="/opt/NazerBazaar"
REPO_URL="https://github.com/nimamakhmali/Nazer-Bazaar.git"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

section "🚀 شروع دیپلوی سامانه پایش قیمت کالا"

# ─── بررسی docker ─────────────────────────────────────────────
section "1. بررسی پیش‌نیازها"
command -v docker &>/dev/null || error "Docker نصب نیست!"
docker compose version &>/dev/null || error "Docker Compose نصب نیست!"
log "Docker و Docker Compose موجودند"

# ─── بررسی پورت 8090 ──────────────────────────────────────────
if ss -tlnp | grep -q ':8090 '; then
    error "پورت 8090 در حال استفاده است! ابتدا پروسس را متوقف کنید."
fi
log "پورت 8090 آزاد است"

# ─── clone یا update پروژه ────────────────────────────────────
section "2. دریافت کد پروژه"
if [ -d "$PROJECT_DIR/.git" ]; then
    info "بروزرسانی مخزن موجود..."
    cd "$PROJECT_DIR"
    git fetch origin
    git reset --hard origin/main
    log "کد بروز شد"
else
    info "Clone مخزن..."
    mkdir -p "$PROJECT_DIR"
    git clone "$REPO_URL" "$PROJECT_DIR"
    log "مخزن clone شد"
fi

cd "$PROJECT_DIR"

# ─── بررسی .env ───────────────────────────────────────────────
section "3. بررسی فایل .env"
if [ ! -f ".env" ]; then
    warn "فایل .env وجود ندارد - در حال ساخت از نمونه..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        warn "فایل .env ساخته شد. لطفاً مقادیر را ویرایش کنید!"
        warn "مخصوصاً: SECRET_KEY, DB_PASSWORD, DJANGO_SUPERUSER_PASSWORD"
        read -p "آیا .env را ویرایش کرده‌اید؟ [y/N]: " yn
        [ "$yn" != "y" ] && [ "$yn" != "Y" ] && error "لطفاً ابتدا .env را تنظیم کنید"
    else
        error "فایل .env.example هم وجود ندارد!"
    fi
fi
log "فایل .env موجود است"

# بررسی SECRET_KEY
if grep -q "change-this-to-a-very-long" .env; then
    warn "SECRET_KEY هنوز پیش‌فرض است - در حال تولید..."
    NEW_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))" 2>/dev/null || \
                 cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*' | fold -w 50 | head -n 1)
    sed -i "s|change-this-to-a-very-long-random-string-in-production-min-50-chars|${NEW_SECRET}|g" .env
    log "SECRET_KEY تولید شد"
fi

# ─── ساخت پوشه‌های لازم ──────────────────────────────────────
section "4. آماده‌سازی پوشه‌ها"
mkdir -p backend/logs nginx
log "پوشه‌ها آماده شدند"

# ─── build تصاویر Docker ──────────────────────────────────────
section "5. Build Docker Images"
info "در حال build... (اولین بار ممکن است 10-20 دقیقه طول بکشد)"
docker compose build --no-cache 2>&1 | tail -20
log "Build کامل شد"

# ─── راه‌اندازی سرویس‌ها ──────────────────────────────────────
section "6. راه‌اندازی سرویس‌ها"

info "راه‌اندازی DB و Redis..."
docker compose up -d db redis
sleep 15

info "راه‌اندازی Backend..."
docker compose up -d backend
sleep 20

info "راه‌اندازی Celery..."
docker compose up -d celery_worker celery_beat

info "راه‌اندازی Frontend..."
docker compose up -d frontend
sleep 30

info "راه‌اندازی Nginx..."
docker compose up -d nginx
sleep 5

# ─── بررسی وضعیت ──────────────────────────────────────────────
section "7. بررسی وضعیت سرویس‌ها"
docker compose ps

# ─── تست اتصال ────────────────────────────────────────────────
section "8. تست اتصال"
sleep 10

info "تست API..."
if curl -sf "http://localhost:8090/api/v1/auth/" -o /dev/null 2>/dev/null; then
    log "API در دسترس است ✅"
elif curl -sf "http://localhost:8090/" -o /dev/null 2>/dev/null; then
    log "Frontend در دسترس است ✅"
else
    warn "هنوز سرویس‌ها در حال راه‌اندازی هستند، لطفاً 30 ثانیه صبر کنید"
fi

section "✅ دیپلوی کامل شد!"
echo -e "${GREEN}"
echo "  🌐 آدرس:    http://171.22.24.139:8090"
echo "  📡 API:     http://171.22.24.139:8090/api/v1/"
echo "  📖 Docs:    http://171.22.24.139:8090/api/docs/"
echo "  🔧 Admin:   http://171.22.24.139:8090/admin/"
echo ""
echo "  دستورات مفید:"
echo "  docker compose logs -f backend     # لاگ backend"
echo "  docker compose logs -f frontend    # لاگ frontend"
echo "  docker compose ps                  # وضعیت سرویس‌ها"
echo -e "${NC}"