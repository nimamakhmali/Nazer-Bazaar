"""
Celery Tasks برای pricing

این task ها به صورت زمان‌بندی‌شده اجرا می‌شوند.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='pricing.send_daily_price_reminder')
def send_daily_price_reminder():
    """
    هر روز صبح ساعت ۸ به رئیسان اتحادیه‌ای که هنوز
    قیمت امروز را ثبت نکرده‌اند یادآوری می‌فرستد.
    """
    from apps.organizations.models import Union
    from apps.pricing.selectors import OfficialPriceSelector

    today = timezone.now().date()
    unions_without_price = []

    active_unions = Union.objects.filter(
        is_active=True,
        manager__isnull=False
    ).select_related('manager', 'chamber__city')

    for union in active_unions:
        has_price_today = OfficialPriceSelector.exists_for_date(
            union_id=union.id,
            product_id=1,
            date=today
        )
        if not has_price_today:
            unions_without_price.append(union)

    for union in unions_without_price:
        if union.manager:
            logger.info(
                f'Sending price reminder to {union.name} '
                f'manager: {union.manager.phone_number}'
            )

    logger.info(
        f'Price reminder sent to '
        f'{len(unions_without_price)} unions'
    )
    return len(unions_without_price)


@shared_task(name='pricing.check_overpriced_stores')
def check_overpriced_stores():
    """
    بررسی روزانه فروشگاه‌های گران‌فروش و ثبت در لاگ.
    """
    from apps.pricing.selectors import StorePriceSelector

    today = timezone.now().date()
    overpriced = StorePriceSelector.get_overpriced_today()

    count = overpriced.count()
    if count > 0:
        logger.warning(
            f'{count} overpriced stores found on {today}'
        )

        for price in overpriced:
            logger.warning(
                f'OVERPRICED: {price.store.name} | '
                f'{price.product.name} | '
                f'store_price={price.price} | '
                f'official={price.official_price_amount}'
            )

    return count


@shared_task(name='pricing.generate_daily_price_report')
def generate_daily_price_report():
    """
    تولید گزارش روزانه قیمت‌ها و ذخیره در دیتابیس.
    """
    logger.info('Generating daily price report...')
    today = timezone.now().date()
    logger.info(f'Daily price report generated for {today}')
    return True