from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery = Celery("susupay", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Accra",
    enable_utc=True,
    beat_schedule={
        "daily-reminders-8am": {
            "task": "app.workers.tasks.daily_reminder_task",
            "schedule": crontab(hour=8, minute=0),
        },
    },
    task_routes={
        "app.workers.tasks.*": {"queue": "default"},
    },
)

# Auto-discover tasks
celery.autodiscover_tasks(["app.workers"])
