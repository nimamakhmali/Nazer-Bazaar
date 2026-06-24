import logging
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

@shared_task(name='notifications.send_sms')
def send_sms_task(phone_number: str, message: str):
    if settings.DEBUG:
        logger.info(f"[DEV SMS] To: {phone_number} | Message: {message}")
        return {"status": "sent_in_dev_mode"}

    try:
        from kavenegar import KavenegarAPI, APIException
        api = KavenegarAPI(settings.KAVENEGAR_API_KEY)
        params = {
            'sender': settings.KAVENEGAR_SENDER,
            'receptor': phone_number,
            'message': message,
        }
        response = api.sms_send(params)
        logger.info(f"SMS sent successfully to {phone_number}. Response: {response}")
        return response
    except APIException as e:
        logger.error(f"Kavenegar API Exception for {phone_number}: {e}")
        raise
    except Exception as e:
        logger.error(f"General SMS sending error for {phone_number}: {e}")
        raise