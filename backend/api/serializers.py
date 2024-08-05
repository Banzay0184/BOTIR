# serializers.py
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
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
    from_company = CompanySerializer()
    products = serializers.ListField(child=serializers.DictField(), write_only=True)
    product_markings = serializers.SerializerMethodField()

    class Meta:
        model = Income
        fields = '__all__'

    def get_product_markings(self, obj):
        product_markings = ProductMarking.objects.filter(income=obj)
        return ProductMarkingSerializer(product_markings, many=True).data

    def create(self, validated_data):
        company_data = validated_data.pop('from_company')
        products_data = validated_data.pop('products')

        company, created = Company.objects.get_or_create(**company_data)
        income = Income.objects.create(from_company=company, **validated_data)

        for product_data in products_data:
            markings_data = product_data.pop('markings', [])
            product, created = Product.objects.get_or_create(**product_data)
            for marking_data in markings_data:
                ProductMarking.objects.create(product=product, income=income, **marking_data)

        return income

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
            ProductMarking.objects.filter(income=instance).delete()  # Удаляем старые записи ProductMarking
            for product_data in products_data:
                markings_data = product_data.pop('markings', [])
                product, created = Product.objects.get_or_create(**product_data)
                for marking_data in markings_data:
                    ProductMarking.objects.create(product=product, income=instance, **marking_data)

        return instance


class OutcomeSerializer(serializers.ModelSerializer):
    to_company = CompanySerializer()
    product_markings = serializers.PrimaryKeyRelatedField(many=True, queryset=ProductMarking.objects.all(),
                                                          write_only=True)

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
            'is_archive'
        )

    def create(self, validated_data):
        company_data = validated_data.pop('to_company')
        product_markings_data = validated_data.pop('product_markings')

        company, created = Company.objects.get_or_create(**company_data)
        outcome = Outcome.objects.create(to_company=company, **validated_data)

        for marking in product_markings_data:
            marking.outcome = outcome
            marking.save()

        return outcome

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

        if product_markings_data:
            instance.product_markings.clear()
            for marking in product_markings_data:
                marking.outcome = instance
                marking.save()

        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['product_markings'] = ProductMarkingSerializer(instance.product_markings.all(), many=True).data
        return representation
