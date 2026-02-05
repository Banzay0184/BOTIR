from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import User


class CustomUser(AbstractUser):
    position = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.username


class Company(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=255)
    inn = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    price = models.FloatField()
    kpi = models.CharField(max_length=255)
    quantity = models.IntegerField(default=0, null=True, blank=True)

    def __str__(self):
        return self.name


class ProductMarking(models.Model):
    marking = models.CharField(max_length=255, unique=True)
    counter = models.BooleanField(default=False, null=True, blank=True)
    income = models.ForeignKey(
        "Income", on_delete=models.CASCADE, related_name="income", null=True, blank=True
    )
    outcome = models.ForeignKey(
        "Outcome", on_delete=models.PROTECT, related_name="product_markings", null=True, blank=True, db_index=True
    )
    product = models.ForeignKey(
        "Product", on_delete=models.CASCADE, related_name="product", null=True, blank=True, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.marking


class Income(models.Model):
    added_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    from_company = models.ForeignKey(Company, related_name="from_company", on_delete=models.CASCADE)
    contract_date = models.DateField(db_index=True)
    contract_number = models.CharField(max_length=255)
    invoice_date = models.DateField(db_index=True)
    invoice_number = models.CharField(max_length=255)
    unit_of_measure = models.CharField(max_length=255)
    total = models.FloatField()
    is_archive = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="archived_incomes",
    )

    def __str__(self):
        return self.contract_number


class Outcome(models.Model):
    added_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    to_company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="to_company")
    contract_date = models.DateField(db_index=True)
    contract_number = models.CharField(max_length=255)
    invoice_date = models.DateField(db_index=True)
    invoice_number = models.CharField(max_length=255)
    unit_of_measure = models.CharField(max_length=255)
    total = models.FloatField()
    is_archive = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="archived_outcomes",
    )

    def __str__(self):
        return self.contract_number
