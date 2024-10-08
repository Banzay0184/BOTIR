from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CompanyViewSet, ProductViewSet, ProductMarkingViewSet, IncomeViewSet, OutcomeViewSet, \
    UpdateMarkingView, MyTokenObtainPairView, RegisterView, logout_view, check_marking_exists
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'products', ProductViewSet)
router.register(r'product-markings', ProductMarkingViewSet)
router.register(r'incomes', IncomeViewSet)
router.register(r'outcomes', OutcomeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('incomes/<int:income_id>/products/<int:product_id>/markings/<int:marking_id>/',
         UpdateMarkingView.as_view(), name='update-marking'),
    path('product-markings/check-marking/<str:marking>/', check_marking_exists, name='check-marking'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('logout/', logout_view, name='auth_logout'),
]
