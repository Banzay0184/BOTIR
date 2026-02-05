from .base import *

DEBUG = False

# Хост PythonAnywhere (в base ALLOWED_HOSTS берётся из DJANGO_ALLOWED_HOSTS)
if "banzay.pythonanywhere.com" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS = list(ALLOWED_HOSTS) + ["banzay.pythonanywhere.com"]

# CORS: прод-домены всегда добавляем (даже если в env только localhost — иначе CORS error для scclms.uz)
_prod_origins = ["https://www.scclms.uz", "https://scclms.uz"]
CORS_ALLOWED_ORIGINS = list(CORS_ALLOWED_ORIGINS) + [o for o in _prod_origins if o not in CORS_ALLOWED_ORIGINS]
CORS_ALLOW_CREDENTIALS = True
# Authorization для Bearer token (django-cors-headers по умолчанию уже разрешает, на всякий случай явно)
CORS_ALLOW_HEADERS = ["accept", "accept-encoding", "authorization", "content-type", "origin", "x-requested-with"]

# если проект за прокси (nginx / pythonanywhere / etc)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

# желательно
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
