from .base import *

DEBUG = False

# в проде указывай реальные домены фронта
# пример:
# CORS_ALLOWED_ORIGINS = ["https://app.scclms.uz"]
# CORS_ALLOW_CREDENTIALS = True

# если проект за прокси (nginx / pythonanywhere / etc)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

# желательно
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
