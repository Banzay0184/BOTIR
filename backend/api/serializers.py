# serializers.py
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.db import transaction
from warehouse.models import Company, Product, ProductMarking, Income, Outcome, CustomUser


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'position', 'phone')


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class ProductMarkingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMarking
        fields = '__all__'


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

        company, created = Company.objects.get_or_create(**company_data)
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
        company_data = validated_data.pop('from_company')
        products_data = validated_data.pop('products', None)

        company, created = Company.objects.get_or_create(**company_data)
        instance.from_company = company
        instance.contract_date = validated_data.get('contract_date', instance.contract_date)
        instance.contract_number = validated_data.get('contract_number', instance.contract_number)
        instance.invoice_date = validated_data.get('invoice_date', instance.invoice_date)
        instance.invoice_number = validated_data.get('invoice_number', instance.invoice_number)
        instance.unit_of_measure = validated_data.get('unit_of_measure', instance.unit_of_measure)
        instance.total = validated_data.get('total', instance.total)
        instance.is_archive = validated_data.get('is_archive', instance.is_archive)
        instance.save()

        if products_data:
            existing_markings = set(ProductMarking.objects.filter(income=instance).values_list('marking', flat=True))
            new_markings = {marking['marking'] for product in products_data for marking in product.get('markings', [])}

            markings_to_delete = existing_markings - new_markings
            ProductMarking.objects.filter(income=instance, marking__in=markings_to_delete).delete()

            for product_data in products_data:
                markings_data = product_data.pop('markings', [])

                product, created = Product.objects.get_or_create(**product_data)

                for marking_data in markings_data:
                    marking_value = marking_data.get('marking')

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
        )

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        company_data = validated_data.pop('to_company')
        product_markings_data = validated_data.pop('product_markings')

        company, created = Company.objects.get_or_create(**company_data)
        outcome = Outcome.objects.create(to_company=company, added_by=user, **validated_data)

        for marking in product_markings_data:
            marking.outcome = outcome
            marking.save()

        return outcome

    @transaction.atomic
    def update(self, instance, validated_data):
        company_data = validated_data.pop('to_company')
        product_markings_data = validated_data.pop('product_markings', None)

        company, created = Company.objects.get_or_create(**company_data)
        instance.to_company = company
        instance.contract_date = validated_data.get('contract_date', instance.contract_date)
        instance.contract_number = validated_data.get('contract_number', instance.contract_number)
        instance.invoice_date = validated_data.get('invoice_date', instance.invoice_date)
        instance.invoice_number = validated_data.get('invoice_number', instance.invoice_number)
        instance.unit_of_measure = validated_data.get('unit_of_measure', instance.unit_of_measure)
        instance.total = validated_data.get('total', instance.total)
        instance.is_archive = validated_data.get('is_archive', instance.is_archive)
        instance.save()

        if product_markings_data is not None:
            instance.product_markings.clear()
            for marking in product_markings_data:
                marking.outcome = instance
                marking.save()

        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['product_markings'] = ProductMarkingSerializer(instance.product_markings.all(), many=True).data
        return representation
