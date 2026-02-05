from rest_framework import permissions


class IsOperatorOrAdminOrReadOnly(permissions.BasePermission):
    """
    Разрешает create/update/delete только пользователям в группах admin или operator.
    Остальным — только чтение (GET, HEAD, OPTIONS).
    Права проверяются по request.user.groups (из БД), не по токену.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_superuser:
            return True
        return request.user.groups.filter(name__in=['admin', 'operator']).exists()


class IsPlatformAdmin(permissions.BasePermission):
    """
    Доступ только для is_superuser или пользователей в группе admin.
    Для Admin API (users, roles, reset-password).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.groups.filter(name='admin').exists()
