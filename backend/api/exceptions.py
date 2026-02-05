"""
Обработчик исключений DRF: все ошибки в формате { "error": { "code", "message", "details" } }.
"""
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied, AuthenticationFailed


def _first_message(detail):
    """Из полей ошибки валидации извлекаем одну строку для message."""
    if isinstance(detail, list):
        return detail[0] if detail else "Ошибка валидации"
    if isinstance(detail, dict):
        for key, value in detail.items():
            if isinstance(value, list) and value:
                return value[0]
            if isinstance(value, str):
                return value
        return "Ошибка валидации"
    return str(detail)


def custom_exception_handler(exc, context):
    """Приводит ответы к формату { "error": { "code", "message", "details" } }."""
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, ValidationError):
        payload = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": _first_message(exc.detail),
                "details": exc.detail,
            }
        }
        return Response(payload, status=response.status_code)

    if isinstance(exc, NotFound):
        payload = {
            "error": {
                "code": "NOT_FOUND",
                "message": str(exc.detail) if exc.detail else "Объект не найден",
                "details": None,
            }
        }
        return Response(payload, status=response.status_code)

    if isinstance(exc, PermissionDenied):
        payload = {
            "error": {
                "code": "PERMISSION_DENIED",
                "message": str(exc.detail) if exc.detail else "Доступ запрещён",
                "details": None,
            }
        }
        return Response(payload, status=response.status_code)

    if isinstance(exc, AuthenticationFailed):
        payload = {
            "error": {
                "code": "AUTHENTICATION_FAILED",
                "message": str(exc.detail) if exc.detail else "Требуется вход",
                "details": None,
            }
        }
        return Response(payload, status=response.status_code)

    # Остальные исключения: оборачиваем response.data в наш формат
    detail = response.data
    if isinstance(detail, dict) and "error" in detail:
        return response
    message = detail.get("detail") if isinstance(detail, dict) else str(detail)
    if isinstance(message, list):
        message = message[0] if message else "Ошибка"
    payload = {
        "error": {
            "code": "ERROR",
            "message": str(message) if message else "Произошла ошибка",
            "details": detail if isinstance(detail, dict) else None,
        }
    }
    return Response(payload, status=response.status_code)
