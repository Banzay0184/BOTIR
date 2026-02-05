from .base import *

DEBUG = False

# Хост PythonAnywhere (в base ALLOWED_HOSTS берётся из DJANGO_ALLOWED_HOSTS)
if "banzay.pythonanywhere.com" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS = list(ALLOWED_HOSTS) + ["banzay.pythonanywhere.com"]

# CORS: без указания origin браузер блокирует ответ (в т.ч. token/). Задай в .env:
#   CORS_ALLOWED_ORIGINS=https://твой-фронт.vercel.app,http://localhost:5173
#   CORS_ALLOW_CREDENTIALS=1
if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = ["https://banzay.pythonanywhere.com"]
CORS_ALLOW_CREDENTIALS = True

# если проект за прокси (nginx / pythonanywhere / etc)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

# желательно
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
