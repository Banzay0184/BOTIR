"""
Фильтры и сортировка для Income/Outcome/ProductMarking (даты, поиск по номеру/маркировке, ordering).
"""
import django_filters
from django.db.models import Q

from warehouse.models import Income, Outcome, ProductMarking


class IncomeFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='contract_date', lookup_expr='gte', label='Дата от')
    date_to = django_filters.DateFilter(field_name='contract_date', lookup_expr='lte', label='Дата до')
    invoice_date_from = django_filters.DateFilter(field_name='invoice_date', lookup_expr='gte', label='Дата счёта от')
    invoice_date_to = django_filters.DateFilter(field_name='invoice_date', lookup_expr='lte', label='Дата счёта до')
    search = django_filters.CharFilter(method='filter_search', label='Поиск (номер, компания)')
    marking = django_filters.CharFilter(method='filter_marking', label='Маркировка')
    is_archive = django_filters.BooleanFilter(field_name='is_archive', label='Архив')
    ordering = django_filters.OrderingFilter(
        fields=(
            ('contract_date', 'contract_date'),
            ('invoice_date', 'invoice_date'),
            ('created_at', 'created_at'),
            ('archived_at', 'archived_at'),
            ('total', 'total'),
            ('invoice_number', 'invoice_number'),
        ),
        field_labels={
            'contract_date': 'Дата договора',
            'invoice_date': 'Дата счёта',
            'created_at': 'Дата создания',
            'archived_at': 'Дата архивации',
            'total': 'Сумма',
            'invoice_number': 'Номер счёта',
        },
    )

    class Meta:
        model = Income
        fields = ['date_from', 'date_to', 'invoice_date_from', 'invoice_date_to', 'search', 'marking', 'is_archive', 'ordering']

    def filter_search(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        q = value.strip()
        return queryset.filter(
            Q(contract_number__icontains=q)
            | Q(invoice_number__icontains=q)
            | Q(from_company__name__icontains=q)
            | Q(from_company__inn__icontains=q)
        )

    def filter_marking(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        return queryset.filter(income__marking__icontains=value.strip()).distinct()


class OutcomeFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='contract_date', lookup_expr='gte', label='Дата от')
    date_to = django_filters.DateFilter(field_name='contract_date', lookup_expr='lte', label='Дата до')
    invoice_date_from = django_filters.DateFilter(field_name='invoice_date', lookup_expr='gte', label='Дата счёта от')
    invoice_date_to = django_filters.DateFilter(field_name='invoice_date', lookup_expr='lte', label='Дата счёта до')
    search = django_filters.CharFilter(method='filter_search', label='Поиск (номер, компания)')
    marking = django_filters.CharFilter(method='filter_marking', label='Маркировка')
    is_archive = django_filters.BooleanFilter(field_name='is_archive', label='Архив')
    ordering = django_filters.OrderingFilter(
        fields=(
            ('contract_date', 'contract_date'),
            ('invoice_date', 'invoice_date'),
            ('created_at', 'created_at'),
            ('archived_at', 'archived_at'),
            ('total', 'total'),
            ('invoice_number', 'invoice_number'),
        ),
        field_labels={
            'contract_date': 'Дата договора',
            'invoice_date': 'Дата счёта',
            'created_at': 'Дата создания',
            'archived_at': 'Дата архивации',
            'total': 'Сумма',
            'invoice_number': 'Номер счёта',
        },
    )

    class Meta:
        model = Outcome
        fields = ['date_from', 'date_to', 'invoice_date_from', 'invoice_date_to', 'search', 'marking', 'is_archive', 'ordering']

    def filter_search(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        q = value.strip()
        return queryset.filter(
            Q(contract_number__icontains=q)
            | Q(invoice_number__icontains=q)
            | Q(to_company__name__icontains=q)
            | Q(to_company__inn__icontains=q)
        )

    def filter_marking(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        return queryset.filter(product_markings__marking__icontains=value.strip()).distinct()


class ProductMarkingFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(field_name='marking', lookup_expr='icontains', label='Маркировка')
    ordering = django_filters.OrderingFilter(
        fields=(
            ('marking', 'marking'),
            ('created_at', 'created_at'),
            ('updated_at', 'updated_at'),
        ),
        field_labels={'marking': 'Маркировка', 'created_at': 'Создан', 'updated_at': 'Обновлён'},
    )

    class Meta:
        model = ProductMarking
        fields = ['search', 'ordering']
