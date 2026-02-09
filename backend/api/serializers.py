# serializers.py
from django.contrib.auth.models import User, Group
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.contrib.auth import get_user_model
from warehouse.models import Company, Product, ProductMarking, Income, Outcome, CustomUser


def get_or_create_company(company_data):
    """
    Найти или создать компанию. Идентификатор — ИНН (если есть).
    Иначе fallback на name+phone. Используем update_or_create по ИНН,
    чтобы обновлять имя/телефон при изменении, а не плодить дубликаты.
    """
    inn = (company_data.get("inn") or "").strip()
    name = (company_data.get("name") or "").strip()
    phone = (company_data.get("phone") or "").strip()
    if inn:
        company, _ = Company.objects.update_or_create(
            inn=inn,
            defaults={"name": name, "phone": phone},
        )
    else:
        company, _ = Company.objects.get_or_create(
            name=name,
            phone=phone,
            defaults={"inn": None},
        )
    return company


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'position', 'phone')


class AdminUserListSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(many=True, slug_field='name', read_only=True)

    class Meta:
        model = CustomUser
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'position', 'is_active', 'groups',
        )


class AdminUserCreateSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all(), required=False)
    password = serializers.CharField(write_only=True, min_length=1)

    class Meta:
        model = CustomUser
        fields = (
            'username', 'email', 'password', 'first_name', 'last_name',
            'phone', 'position', 'groups',
        )

    def create(self, validated_data):
        groups = validated_data.pop('groups', [])
        password = validated_data.pop('password')
        user = get_user_model().objects.create_user(
            password=password,
            **validated_data,
        )
        if groups:
            user.groups.set(groups)
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all(), required=False)

    class Meta:
        model = CustomUser
        fields = ('first_name', 'last_name', 'phone', 'position', 'groups', 'is_active')

    def update(self, instance, validated_data):
        groups = validated_data.pop('groups', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        return instance


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ('id', 'name')


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    """stock — из annotate в ProductViewSet; у нового продукта атрибута нет, возвращаем 0."""

    stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_stock(self, obj):
        return getattr(obj, 'stock', 0)


class ProductSelectSerializer(serializers.ModelSerializer):
    """
    Лёгкий сериалайзер для выпадающих списков на фронте.
    Не включает вычисляемые поля (например stock), чтобы не грузить БД.
    """

    class Meta:
        model = Product
        fields = ('id', 'name', 'kpi', 'price')


class ProductMarkingSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_kpi = serializers.SerializerMethodField()
    product_price = serializers.SerializerMethodField()
    income_unit_of_measure = serializers.SerializerMethodField()

    class Meta:
        model = ProductMarking
        fields = [
            'id', 'marking', 'counter', 'income', 'outcome', 'product',
            'product_name', 'product_kpi', 'product_price', 'income_unit_of_measure',
            'created_at', 'updated_at',
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product_id else None

    def get_product_kpi(self, obj):
        return obj.product.kpi if obj.product_id else None

    def get_product_price(self, obj):
        return obj.product.price if obj.product_id else None

    def get_income_unit_of_measure(self, obj):
        return obj.income.unit_of_measure if obj.income_id else None


class IncomeSerializer(serializers.ModelSerializer):
    added_by = serializers.StringRelatedField()
    from_company = CompanySerializer()
    products = serializers.ListField(child=serializers.DictField(), write_only=True)
    product_markings = serializers.SerializerMethodField()

    class Meta:
        model = Income
        fields = '__all__'

    def get_product_markings(self, obj):
        product_markings = ProductMarking.objects.filter(income=obj)
        return ProductMarkingSerializer(product_markings, many=True).data

    @transaction.atomic
    def create(self, validated_data):
        company_data = validated_data.pop('from_company')
        products_data = validated_data.pop('products')
        user = self.context['request'].user  # Получаем текущего пользователя

        # Проверка аутентификации пользователя
        if not user.is_authenticated:
            raise ValidationError("Пользователь должен быть аутентифицирован для создания записи.")

        company = get_or_create_company(company_data)
        income = Income.objects.create(from_company=company, added_by=user, **validated_data)

        for product_data in products_data:
            markings_data = product_data.pop('markings', [])

            product, created = Product.objects.get_or_create(**product_data)

            for marking_data in markings_data:
                marking_value = marking_data.get('marking')

                if ProductMarking.objects.filter(marking=marking_value).exists():
                    raise ValidationError(f'Маркировка "{marking_value}" уже существует.')

                ProductMarking.objects.create(product=product, income=income, **marking_data)

        return income

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.is_archive:
            raise ValidationError(
                {'is_archive': 'Редактирование архивного документа прихода запрещено.'}
            )
        validated_data.pop('is_archive', None)  # Менять только через POST .../archive/ и .../unarchive/
        company_data = validated_data.pop('from_company', None)
        products_data = validated_data.pop('products', None)

        if company_data is not None:
            instance.from_company = get_or_create_company(company_data)
        instance.contract_date = validated_data.get('contract_date', instance.contract_date)
        instance.contract_number = validated_data.get('contract_number', instance.contract_number)
        instance.invoice_date = validated_data.get('invoice_date', instance.invoice_date)
        instance.invoice_number = validated_data.get('invoice_number', instance.invoice_number)
        instance.unit_of_measure = validated_data.get('unit_of_measure', instance.unit_of_measure)
        instance.total = validated_data.get('total', instance.total)
        instance.save()

        if products_data:
            existing_markings = set(ProductMarking.objects.filter(income=instance).values_list('marking', flat=True))
            new_markings = {marking['marking'] for product in products_data for marking in product.get('markings', [])}

            markings_to_delete = existing_markings - new_markings
            if markings_to_delete:
                to_delete_qs = ProductMarking.objects.filter(income=instance, marking__in=markings_to_delete)
                if to_delete_qs.filter(outcome__isnull=False).exists():
                    raise ValidationError({
                        'products': ['Нельзя удалить или убрать из документа списанные маркировки.']
                    })
                to_delete_qs.delete()

            for product_data in products_data:
                markings_data = product_data.pop('markings', [])

                product, created = Product.objects.get_or_create(**product_data)

                for marking_data in markings_data:
                    marking_value = marking_data.get('marking')
                    # Уже есть на этом приходе (оставили в списке) — не создаём повторно
                    if ProductMarking.objects.filter(marking=marking_value, income=instance).exists():
                        continue
                    if ProductMarking.objects.filter(marking=marking_value).exists():
                        raise ValidationError(f'Маркировка "{marking_value}" уже существует.')

                    ProductMarking.objects.create(product=product, income=instance, **marking_data)

        return instance


class OutcomeSerializer(serializers.ModelSerializer):
    to_company = CompanySerializer()
    product_markings = serializers.PrimaryKeyRelatedField(
        many=True, queryset=ProductMarking.objects.all(), write_only=True
    )
    added_by = serializers.StringRelatedField(read_only=True)  # Display the user's name

    def get_fields(self):
        fields = super().get_fields()
        # При PUT/PATCH не требовать product_markings: если не прислали — не трогаем маркировки.
        view = self.context.get('view')
        if view and getattr(view, 'action', None) in ('update', 'partial_update'):
            fields['product_markings'].required = False
        return fields

    class Meta:
        model = Outcome
        fields = (
            'id',
            'to_company',
            'contract_date',
            'contract_number',
            'invoice_date',
            'invoice_number',
            'product_markings',
            'unit_of_measure',
            'total',
            'is_archive',
            'added_by',
            'created_at', 'updated_at', 'archived_at', 'archived_by',
        )

    def _validate_markings_not_already_written_off(self, product_markings_data, instance=None):
        """Правило №1: маркировку нельзя списать дважды. При update разрешаем маркировки этого outcome."""
        already_used = [
            m.marking for m in product_markings_data
            if m.outcome_id is not None and (instance is None or m.outcome_id != instance.id)
        ]
        if already_used:
            raise ValidationError({
                'product_markings': [f'Маркировка уже списана: {m}' for m in already_used[:10]]
            })

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        company_data = validated_data.pop('to_company')
        product_markings_data = validated_data.pop('product_markings')

        self._validate_markings_not_already_written_off(product_markings_data)

        company = get_or_create_company(company_data)
        outcome = Outcome.objects.create(to_company=company, added_by=user, **validated_data)

        # Защита от гонок: атомарный UPDATE только по маркировкам с outcome__isnull=True;
        # при параллельных запросах один получит updated < len → 400 + список конфликтных маркировок.
        marking_ids = [m.id for m in product_markings_data]
        updated = ProductMarking.objects.filter(
            id__in=marking_ids, outcome__isnull=True
        ).update(outcome=outcome)
        if updated != len(marking_ids):
            not_attached = ProductMarking.objects.filter(id__in=marking_ids).exclude(outcome=outcome)
            conflicting = list(not_attached.values_list('marking', flat=True))[:10]
            raise ValidationError({
                'product_markings': [f'Маркировка уже списана: {m}' for m in conflicting]
            })

        return outcome

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.is_archive:
            raise ValidationError(
                {'is_archive': 'Редактирование архивного документа расхода запрещено.'}
            )
        validated_data.pop('is_archive', None)  # Менять только через POST .../archive/ и .../unarchive/
        company_data = validated_data.pop('to_company')
        # Если product_markings не прислали (optional при PUT/PATCH) — не трогаем маркировки.
        product_markings_data = validated_data.pop('product_markings', None)

        instance.to_company = get_or_create_company(company_data)
        instance.contract_date = validated_data.get('contract_date', instance.contract_date)
        instance.contract_number = validated_data.get('contract_number', instance.contract_number)
        instance.invoice_date = validated_data.get('invoice_date', instance.invoice_date)
        instance.invoice_number = validated_data.get('invoice_number', instance.invoice_number)
        instance.unit_of_measure = validated_data.get('unit_of_measure', instance.unit_of_measure)
        instance.total = validated_data.get('total', instance.total)
        instance.save()

        # Маркировки меняем только если их прислали (иначе оставляем как есть). Синхронизация: to_detach / to_attach.
        # current_ids = уже привязано; new_ids = пришло с фронта; привязываем to_attach только при outcome__isnull=True.
        if product_markings_data is not None and not instance.is_archive:
            self._validate_markings_not_already_written_off(product_markings_data, instance=instance)
            current_ids = set(
                instance.product_markings.values_list('id', flat=True)
            )
            new_ids = set(m.id for m in product_markings_data)
            to_detach = current_ids - new_ids
            to_attach = new_ids - current_ids

            if to_detach:
                ProductMarking.objects.filter(
                    id__in=to_detach, outcome=instance
                ).update(outcome=None)

            if to_attach:
                updated = ProductMarking.objects.filter(
                    id__in=to_attach, outcome__isnull=True
                ).update(outcome=instance)
                if updated != len(to_attach):
                    not_attached = ProductMarking.objects.filter(
                        id__in=to_attach
                    ).exclude(outcome=instance)
                    conflicting = list(not_attached.values_list('marking', flat=True))[:10]
                    raise ValidationError({
                        'product_markings': [f'Маркировка уже списана: {m}' for m in conflicting]
                    })

        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['product_markings'] = ProductMarkingSerializer(instance.product_markings.all(), many=True).data
        return representation
