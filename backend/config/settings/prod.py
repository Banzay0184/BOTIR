from .base import *

DEBUG = False

# Хост PythonAnywhere (в base ALLOWED_HOSTS берётся из DJANGO_ALLOWED_HOSTS)
if "banzay.pythonanywhere.com" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS = list(ALLOWED_HOSTS) + ["banzay.pythonanywhere.com"]

# CORS: прод-домены уже добавлены в base; в проде включаем credentials
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
