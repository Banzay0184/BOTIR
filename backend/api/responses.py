"""
Единый формат ошибок API: { "error": { "code", "message", "details" } }.
Упрощает UX (одинаковые тосты), локализацию и логирование.
"""
from rest_framework import status
from rest_framework.response import Response


def _first_validation_message(detail):
    """Первое сообщение из serializer.errors для message."""
    if isinstance(detail, list):
        return detail[0] if detail else "Ошибка валидации"
    if isinstance(detail, dict):
        for value in detail.values():
            if isinstance(value, list) and value:
                return value[0]
            if isinstance(value, str):
                return value
    return "Ошибка валидации"


def error_response(code, message, details=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Ответ в едином формате: error.code, error.message, error.details (может быть null)."""
    payload = {
        "error": {
            "code": code,
            "message": message,
            "details": details,
        }
    }
    return Response(payload, status=status_code)
