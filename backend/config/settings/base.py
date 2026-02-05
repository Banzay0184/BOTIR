from pathlib import Path
from datetime import timedelta
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
# Сначала из текущей директории, затем явно из корня проекта (на PythonAnywhere WSGI cwd может быть другой)
load_dotenv()
load_dotenv(BASE_DIR / ".env")

ENVIRONMENT = os.getenv("DJANGO_ENV", "dev")  

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-unsafe-key")
DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,banzay.pythonanywhere.com").split(",")
    if h.strip()
]

# CORS: из env + всегда добавляем прод-домены (чтобы работало и в dev, и на PythonAnywhere)
_cors_origins = os.getenv("CORS_ALLOWED_ORIGINS") or os.getenv("CORS_ALLOW_ORIGINS") or ""
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(",") if o.strip()]
for _origin in ("https://www.scclms.uz", "https://scclms.uz"):
    if _origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(_origin)
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "0") == "1"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",

    "rest_framework",
    "django_filters",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",

    "api",
    "warehouse",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "EXCEPTION_HANDLER": "api.exceptions.custom_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),

    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,

    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# DB_ENGINE = os.getenv("DB_ENGINE", "sqlite")

# if DB_ENGINE == "postgres":
#     DATABASES = {
#         "default": {
#             "ENGINE": "django.db.backends.postgresql",
#             "NAME": os.getenv("POSTGRES_DB"),
#             "USER": os.getenv("POSTGRES_USER"),
#             "PASSWORD": os.getenv("POSTGRES_PASSWORD"),
#             "HOST": os.getenv("POSTGRES_HOST", "localhost"),
#             "PORT": os.getenv("POSTGRES_PORT", "5432"),
#         }
#     }
# else:
#     DATABASES = {
#         "default": {
#             "ENGINE": "django.db.backends.sqlite3",
#             "NAME": BASE_DIR / "db.sqlite3",
#         }
#     }


AUTH_USER_MODEL = "warehouse.CustomUser"

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Asia/Samarkand"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
