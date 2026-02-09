from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings as jwt_api_settings
from rest_framework.decorators import api_view, action, permission_classes as perm_classes
from .serializers import CustomUserSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin, CreateModelMixin, UpdateModelMixin
from rest_framework.viewsets import GenericViewSet
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
import logging
from collections import Counter
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django_filters.rest_framework import DjangoFilterBackend
from warehouse.models import Company, Product, ProductMarking, Income, Outcome, CustomUser
from .serializers import (
    CompanySerializer, ProductSerializer, ProductMarkingSerializer, IncomeSerializer,
    OutcomeSerializer,
    ProductSelectSerializer,
    AdminUserListSerializer, AdminUserCreateSerializer, AdminUserUpdateSerializer, GroupSerializer,
)
from .permissions import IsOperatorOrAdminOrReadOnly, IsPlatformAdmin
from .responses import error_response, _first_validation_message
from .filters import IncomeFilter, OutcomeFilter, ProductMarkingFilter


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, IsOperatorOrAdminOrReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    # stock = число ProductMarking у продукта с outcome IS NULL.
    # Связь Product -> ProductMarking: related_name="product" (ProductMarking.product -> Product).
    # Считаем маркировки: Count(обратная_связь, filter=обратная_связь__outcome__isnull=True).
    queryset = Product.objects.annotate(
        stock=Count('product', filter=Q(product__outcome__isnull=True))
    )
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsOperatorOrAdminOrReadOnly]

    @action(detail=False, methods=['get'], url_path='select')
    def select(self, request, *args, **kwargs):
        """
        Быстрый список товаров для выпадающих списков/поиска.
        Важно: без annotate(stock=...), иначе запросы могут быть очень тяжёлыми.

        Query params:
        - q: строка поиска по name/kpi
        - page: стандартная пагинация DRF (PageNumberPagination)
        """
        q = (request.query_params.get('q') or '').strip()
        qs = Product.objects.all()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(kpi__icontains=q))
        qs = qs.order_by('name', 'id')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ProductSelectSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ProductSelectSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProductMarkingViewSet(viewsets.ModelViewSet):
    queryset = ProductMarking.objects.select_related('income', 'product', 'outcome').all()
    serializer_class = ProductMarkingSerializer
    permission_classes = [IsAuthenticated, IsOperatorOrAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProductMarkingFilter
    http_method_names = ['get', 'post', 'put', 'delete']

    def _marking_archived_error(self, income_id):
        return error_response(
            'ARCHIVED',
            'Нельзя изменять маркировки в архивном документе прихода.',
            details={'income_id': income_id},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    def _is_archived_income(self, marking):
        return marking.income_id is not None and marking.income is not None and marking.income.is_archive

    def _marking_written_off_error(self, marking_id):
        """ProductMarking.outcome != null → нельзя менять текст маркировки, удалять, перепривязывать (бухгалтерия)."""
        return error_response(
            'MARKING_WRITTEN_OFF',
            'Маркировка уже списана. Удаление и изменение запрещены.',
            details={'marking_id': marking_id},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    def create(self, request, *args, **kwargs):
        income_id = request.data.get('income')
        if income_id:
            income = Income.objects.filter(pk=income_id).first()
            if income and income.is_archive:
                return self._marking_archived_error(income_id)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.outcome_id is not None:
            return self._marking_written_off_error(instance.id)
        if self._is_archived_income(instance):
            return self._marking_archived_error(instance.income_id)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.outcome_id is not None:
            return self._marking_written_off_error(instance.id)
        if self._is_archived_income(instance):
            return self._marking_archived_error(instance.income_id)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.outcome_id is not None:
            return self._marking_written_off_error(instance.id)
        if self._is_archived_income(instance):
            return self._marking_archived_error(instance.income_id)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='available')
    def available(self, request, *args, **kwargs):
        """
        Список доступных (не списанных) маркировок для главного склада.
        Фильтры:
        - outcome IS NULL (товар не списан)
        - income.is_archive = False (документ прихода не в архиве)

        Оптимизация: select_related('product', 'income') убирает N+1 при отдаче
        product_name, product_kpi, income_unit_of_measure. Индексы: outcome_id, product_id, income_id.
        Поиск по marking (icontains). Для Postgres: при росте данных можно добавить
        pg_trgm и GIN-индекс по marking для ускорения ILIKE.

        Query params: search (по marking, product name), page.
        """
        qs = (
            ProductMarking.objects.filter(
                outcome__isnull=True,
                income__is_archive=False,
            )
            .select_related('product', 'income')
            .order_by('-created_at')
        )

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(marking__icontains=search) | Q(product__name__icontains=search)
            )
        
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# Правило архива: is_archive=True = полная заморозка документа (финальная фиксация).
# Нельзя: updateIncome, updateMarking, deleteMarking для прихода/маркировок прихода;
# updateOutcome для расхода; архивный документ можно только удалить (после архивации).
# Изменение is_archive только через POST .../archive/ и .../unarchive/.


class IncomeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOperatorOrAdminOrReadOnly]
    queryset = Income.objects.prefetch_related("income").select_related('from_company', 'added_by').order_by('created_at')
    serializer_class = IncomeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = IncomeFilter

    def get_queryset(self):
        """Все приходы видны всем авторизованным пользователям (без фильтра по added_by)."""
        qs = Income.objects.prefetch_related("income").select_related('from_company', 'added_by')
        if self.request.query_params.get('is_archive') == 'true':
            # Последний добавленный в архив — первым в списке
            return qs.order_by('-archived_at', '-id')
        return qs.order_by('created_at')

    # Правило архива (must при странице /archive): архивный приход — только чтение. PUT/PATCH → 400.
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_archive:
            return error_response(
                'ARCHIVED',
                'Редактирование архивного документа прихода запрещено.',
                details={'id': instance.id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_archive:
            return error_response(
                'ARCHIVED',
                'Редактирование архивного документа прихода запрещено.',
                details={'id': instance.id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """Правило №2: архивировать перед удалением. Аудит: archived_at, archived_by."""
        income = self.get_object()
        income.is_archive = True
        income.archived_at = timezone.now()
        income.archived_by = request.user
        income.save()
        return Response({'detail': 'ok', 'is_archive': True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unarchive')
    def unarchive(self, request, pk=None):
        income = self.get_object()
        income.is_archive = False
        income.archived_at = None
        income.archived_by = None
        income.save()
        return Response({'detail': 'ok', 'is_archive': False}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        income = self.get_object()
        if not income.is_archive:
            return error_response(
                'NOT_ARCHIVED',
                'Нельзя удалить неархивированный документ. Сначала архивируйте.',
                details={'id': income.id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        written_off_count = ProductMarking.objects.filter(income=income).exclude(outcome__isnull=True).count()
        if written_off_count > 0:
            return error_response(
                'HAS_WRITTEN_OFF_MARKINGS',
                'Нельзя удалить приход: часть маркировок уже списана в расход.',
                details={'count': written_off_count},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        related_markings = ProductMarking.objects.filter(income=income)
        related_markings.delete()
        income.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OutcomeViewSet(viewsets.ModelViewSet):
    queryset = Outcome.objects.select_related('to_company', 'added_by').prefetch_related('product_markings').order_by('created_at')
    serializer_class = OutcomeSerializer
    permission_classes = [IsAuthenticated, IsOperatorOrAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = OutcomeFilter

    def get_queryset(self):
        """Все расходы видны всем авторизованным пользователям (без фильтра по added_by)."""
        qs = Outcome.objects.select_related('to_company', 'added_by').prefetch_related('product_markings')
        if self.request.query_params.get('is_archive') == 'true':
            # Последний добавленный в архив — первым в списке
            return qs.order_by('-archived_at', '-id')
        return qs.order_by('created_at')

    # Правило архива (must при отдельной странице /archive): архивный расход — только чтение.
    # PUT/PATCH/DELETE по архиву: редактирование запрещено (400); удаление — только после архива, затем разрешено.
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_archive:
            return error_response(
                'ARCHIVED',
                'Редактирование архивного документа расхода запрещено.',
                details={'id': instance.id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_archive:
            return error_response(
                'ARCHIVED',
                'Редактирование архивного документа расхода запрещено.',
                details={'id': instance.id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        outcome = self.get_object()
        outcome.is_archive = True
        outcome.archived_at = timezone.now()
        outcome.archived_by = request.user
        outcome.save()
        return Response({'detail': 'ok', 'is_archive': True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unarchive')
    def unarchive(self, request, pk=None):
        outcome = self.get_object()
        outcome.is_archive = False
        outcome.archived_at = None
        outcome.archived_by = None
        outcome.save()
        return Response({'detail': 'ok', 'is_archive': False}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        outcome = self.get_object()
        if not outcome.is_archive:
            return error_response(
                'NOT_ARCHIVED',
                'Нельзя удалить неархивированный документ. Сначала архивируйте.',
                details={'id': outcome.id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        ProductMarking.objects.filter(outcome=outcome).update(outcome=None)
        outcome.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UpdateMarkingView(APIView):
    """PUT/DELETE маркировки в приходе. Запрет, если marking.outcome != null (уже списана)."""
    permission_classes = [IsAuthenticated, IsOperatorOrAdminOrReadOnly]

    def put(self, request, income_id, product_id, marking_id):
        try:
            marking = ProductMarking.objects.select_related('income').get(
                id=marking_id, income_id=income_id, product_id=product_id
            )
        except ProductMarking.DoesNotExist:
            return error_response(
                "NOT_FOUND",
                "Маркировка не найдена",
                details={"income_id": income_id, "product_id": product_id, "marking_id": marking_id},
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if marking.income and marking.income.is_archive:
            return error_response(
                'ARCHIVED',
                'Нельзя изменять маркировки в архивном документе прихода.',
                details={'income_id': income_id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if marking.outcome_id is not None:
            return error_response(
                'MARKING_WRITTEN_OFF',
                'Маркировка уже списана. Удаление и изменение запрещены.',
                details={'marking_id': marking_id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ProductMarkingSerializer(marking, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return error_response(
            "VALIDATION_ERROR",
            _first_validation_message(serializer.errors),
            details=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, income_id, product_id, marking_id, format=None):
        try:
            marking = ProductMarking.objects.select_related('income').get(
                id=marking_id, product_id=product_id, income_id=income_id
            )
        except ProductMarking.DoesNotExist:
            return error_response(
                "NOT_FOUND",
                "Маркировка не найдена",
                details={"income_id": income_id, "product_id": product_id, "marking_id": marking_id},
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if marking.income and marking.income.is_archive:
            return error_response(
                'ARCHIVED',
                'Нельзя изменять маркировки в архивном документе прихода.',
                details={'income_id': income_id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if marking.outcome_id is not None:
            return error_response(
                'MARKING_WRITTEN_OFF',
                'Маркировка уже списана. Удаление и изменение запрещены.',
                details={'marking_id': marking_id},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        marking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super(MyTokenObtainPairSerializer, cls).get_token(user)
        # Добавляем дополнительные данные в токен
        token['username'] = user.username
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['email'] = user.email
        token['phone'] = user.phone
        token['position'] = user.position
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data.update({
            'username': self.user.username,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'email': self.user.email,
            'phone': self.user.phone,
            'position': self.user.position,
            'groups': [g.name for g in self.user.groups.all()],
            'is_superuser': self.user.is_superuser,
        })
        return data


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class MyTokenRefreshSerializer(TokenRefreshSerializer):
    """Добавляем groups в ответ refresh для UI (безопасность — по request.user.groups)."""

    def validate(self, attrs):
        # Получаем user_id до super().validate(): после него токен попадёт в blacklist,
        # и повторный RefreshToken(attrs['refresh']) вызовет TokenError при verify().
        refresh = RefreshToken(attrs['refresh'])
        user_id = refresh.payload.get(jwt_api_settings.USER_ID_CLAIM)

        data = super().validate(attrs)

        if user_id:
            user = get_user_model().objects.filter(**{jwt_api_settings.USER_ID_FIELD: user_id}).first()
            if user:
                data['groups'] = [g.name for g in user.groups.all()]
                data['is_superuser'] = user.is_superuser
            else:
                data['groups'] = []
                data['is_superuser'] = False
        else:
            data['groups'] = []
            data['is_superuser'] = False
        return data


class MyTokenRefreshView(TokenRefreshView):
    serializer_class = MyTokenRefreshSerializer


class RegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    permission_classes = (AllowAny,)
    serializer_class = CustomUserSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = get_user_model().objects.create_user(
                username=serializer.validated_data['username'],
                password=request.data['password'],
                first_name=serializer.validated_data.get('first_name', ''),
                last_name=serializer.validated_data.get('last_name', ''),
                email=serializer.validated_data.get('email', ''),
                phone=serializer.validated_data.get('phone', ''),
                position=serializer.validated_data.get('position', '')
            )
            return Response(status=status.HTTP_201_CREATED)
        return error_response(
            "VALIDATION_ERROR",
            _first_validation_message(serializer.errors),
            details=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


@api_view(['POST'])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh_token')
        if not refresh_token:
            return error_response(
                "BAD_REQUEST",
                "Требуется refresh_token",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
    except Exception:
        return error_response(
            "BAD_REQUEST",
            "Не удалось выйти из системы",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


@api_view(['GET'])
def check_marking_exists(request, marking):
    exists = ProductMarking.objects.filter(marking=marking).exists()
    return Response({'exists': exists})


@api_view(['POST'])
@perm_classes([IsAuthenticated])
def check_markings_batch(request):
    """
    Проверка маркировок пачкой.
    Body: { "markings": ["ABC1", "ABC2", ...] }
    Response: { "exists": [...], "duplicates": [...] }
    exists — уже есть в базе; duplicates — повторились внутри запроса.
    """
    markings = request.data.get('markings')
    if not isinstance(markings, list):
        return Response(
            {'error': 'Ожидается массив markings'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    # Нормализуем: строки, без пустых
    normalized = [str(m).strip() for m in markings if m is not None and str(m).strip()]
    if not normalized:
        return Response({'exists': [], 'duplicates': []})

    # Дубликаты внутри запроса (значения, встречающиеся больше одного раза)
    counts = Counter(normalized)
    duplicates = [m for m, c in counts.items() if c > 1]

    # Уже есть в базе
    unique_markings = list(set(normalized))
    existing_qs = ProductMarking.objects.filter(marking__in=unique_markings)
    exists = list(existing_qs.values_list('marking', flat=True))

    return Response({'exists': exists, 'duplicates': duplicates})


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Статистика для дашборда без загрузки всех записей: агрегаты по году, доступные годы, остаток.
    GET ?year=2024 — по умолчанию текущий год.
    """
    from datetime import date

    year = request.GET.get('year')
    try:
        year = int(year) if year else date.today().year
    except (TypeError, ValueError):
        year = date.today().year

    # Доступные годы (есть приходы или расходы)
    income_years = [d.year for d in Income.objects.dates('contract_date', 'year', order='DESC')]
    outcome_years = [d.year for d in Outcome.objects.dates('contract_date', 'year', order='DESC')]
    available_years = sorted(set(income_years) | set(outcome_years), reverse=True) or [year]

    # Приходы по месяцам за год (агрегаты, без загрузки записей)
    income_by_month = (
        Income.objects.filter(contract_date__year=year)
        .annotate(month=TruncMonth('contract_date'))
        .values('month')
        .annotate(
            doc_count=Count('id'),
            total=Sum('total'),
            items=Count('income', distinct=False),
        )
    )
    month_to_income = {row['month'].month: row for row in income_by_month if row['month']}
    income_by_month_12 = []
    income_total_count = 0
    income_total_sum = 0.0
    income_total_items = 0
    for m in range(1, 13):
        row = month_to_income.get(m, {'doc_count': 0, 'total': 0, 'items': 0})
        total = float(row['total'] or 0)
        doc_count = row['doc_count'] or 0
        items = row['items'] or 0
        income_by_month_12.append({'month': m, 'doc_count': doc_count, 'total': total, 'items': items})
        income_total_count += doc_count
        income_total_sum += total
        income_total_items += items

    # Расходы по месяцам за год
    outcome_by_month = (
        Outcome.objects.filter(contract_date__year=year)
        .annotate(month=TruncMonth('contract_date'))
        .values('month')
        .annotate(
            doc_count=Count('id'),
            total=Sum('total'),
            items=Count('product_markings', distinct=False),
        )
    )
    month_to_outcome = {row['month'].month: row for row in outcome_by_month if row['month']}
    outcome_by_month_12 = []
    outcome_total_count = 0
    outcome_total_sum = 0.0
    outcome_total_items = 0
    for m in range(1, 13):
        row = month_to_outcome.get(m, {'doc_count': 0, 'total': 0, 'items': 0})
        total = float(row['total'] or 0)
        doc_count = row['doc_count'] or 0
        items = row['items'] or 0
        outcome_by_month_12.append({'month': m, 'doc_count': doc_count, 'total': total, 'items': items})
        outcome_total_count += doc_count
        outcome_total_sum += total
        outcome_total_items += items

    # Остаток: количество свободных маркировок и сумма по цене продукта
    stock_agg = ProductMarking.objects.filter(outcome__isnull=True).aggregate(
        items_count=Count('id'),
        value=Sum('product__price'),
    )
    stock_value = float(stock_agg['value'] or 0)
    stock_items = stock_agg['items_count'] or 0

    return Response({
        'year': year,
        'available_years': available_years,
        'incomes': {
            'by_month': income_by_month_12,
            'total_count': income_total_count,
            'total_sum': round(income_total_sum, 2),
            'total_items': income_total_items,
        },
        'outcomes': {
            'by_month': outcome_by_month_12,
            'total_count': outcome_total_count,
            'total_sum': round(outcome_total_sum, 2),
            'total_items': outcome_total_items,
        },
        'stock': {
            'items_count': stock_items,
            'value': round(stock_value, 2),
        },
    })


# --- Admin API ---

logger = logging.getLogger(__name__)
admin_audit_logger = logging.getLogger('api.admin_audit')


class AdminUserViewSet(GenericViewSet, ListModelMixin, RetrieveModelMixin, CreateModelMixin, UpdateModelMixin):
    """Admin API: список, создание, просмотр, обновление пользователей. Disable — PATCH is_active=False."""
    permission_classes = [IsPlatformAdmin]
    queryset = CustomUser.objects.all().prefetch_related('groups')

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        if self.action in ('partial_update', 'update'):
            return AdminUserUpdateSerializer
        return AdminUserListSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        user = serializer.instance
        admin_audit_logger.info(
            'create_user target_id=%s target_username=%s by admin_id=%s',
            user.id, user.username, self.request.user.id,
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        was_active = instance.is_active
        super().perform_update(serializer)
        if was_active and not serializer.instance.is_active:
            admin_audit_logger.info(
                'disable_user target_id=%s target_username=%s by admin_id=%s',
                serializer.instance.id, serializer.instance.username, self.request.user.id,
            )


class AdminRoleViewSet(GenericViewSet, ListModelMixin):
    """Admin API: список ролей (групп). Read-only."""
    permission_classes = [IsPlatformAdmin]
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class AdminResetPasswordView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        try:
            user_id = int(request.data.get('user_id'))
        except (TypeError, ValueError):
            user_id = None
        new_password = request.data.get('new_password')
        if user_id is None or not new_password:
            return error_response(
                "BAD_REQUEST",
                "Укажите user_id и new_password",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if request.user.id == user_id:
            return error_response(
                "BAD_REQUEST",
                "Нельзя сменить пароль себе через этот endpoint",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return error_response(
                "NOT_FOUND",
                "Пользователь не найден",
                details={"user_id": user_id},
                status_code=status.HTTP_404_NOT_FOUND,
            )
        try:
            validate_password(new_password, user)
        except DjangoValidationError as e:
            msg = list(e.messages)[0] if e.messages else "Некорректный пароль"
            return error_response(
                "VALIDATION_ERROR",
                msg,
                details={"messages": list(e.messages)},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.save()
        admin_audit_logger.info(
            'reset_password target_id=%s target_username=%s by admin_id=%s',
            user_id, getattr(user, 'username', ''), request.user.id,
        )
        return Response({'detail': 'Password updated'}, status=status.HTTP_200_OK)
