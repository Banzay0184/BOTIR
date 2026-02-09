from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CompanyViewSet, ProductViewSet, ProductMarkingViewSet, IncomeViewSet, OutcomeViewSet,
    UpdateMarkingView, MyTokenObtainPairView, MyTokenRefreshView, RegisterView, logout_view,
    check_marking_exists, check_markings_batch, dashboard_stats,
    AdminUserViewSet, AdminRoleViewSet, AdminResetPasswordView,
)

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'products', ProductViewSet)
router.register(r'product-markings', ProductMarkingViewSet)
router.register(r'incomes', IncomeViewSet)
router.register(r'outcomes', OutcomeViewSet)

admin_router = DefaultRouter()
admin_router.register(r'users', AdminUserViewSet, basename='admin-users')
admin_router.register(r'roles', AdminRoleViewSet, basename='admin-roles')

urlpatterns = [
    path('product-markings/check/', check_markings_batch, name='check-markings-batch'),
    path('', include(router.urls)),
    path('stats/dashboard/', dashboard_stats, name='dashboard-stats'),
    path('admin/', include(admin_router.urls)),
    path('admin/reset-password/', AdminResetPasswordView.as_view(), name='admin-reset-password'),
    path('incomes/<int:income_id>/products/<int:product_id>/markings/<int:marking_id>/',
         UpdateMarkingView.as_view(), name='update-marking'),
    path('product-markings/check-marking/<str:marking>/', check_marking_exists, name='check-marking'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('logout/', logout_view, name='auth_logout'),
]
