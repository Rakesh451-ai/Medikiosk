from .base import *

DEBUG = True
CELERY_TASK_ALWAYS_EAGER = config('CELERY_TASK_ALWAYS_EAGER', default=False, cast=bool)
CORS_ALLOW_ALL_ORIGINS = True
