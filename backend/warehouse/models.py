from django.db import models
from django.contrib.auth.models import AbstractUser


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
    kpi = models.FloatField()
    quantity = models.IntegerField()

    def __str__(self):
        return self.name


class ProductMarking(models.Model):
    marking = models.CharField(max_length=255, unique=True)
    income = models.ForeignKey("Income", on_delete=models.CASCADE, related_name="income", null=True,
                               blank=True)
    outcome = models.ForeignKey("Outcome", on_delete=models.CASCADE, related_name="product_markings", null=True,
                                blank=True)
    product = models.ForeignKey("Product", on_delete=models.CASCADE, related_name="product", null=True,
                                blank=True)

    def __str__(self):
        return self.marking


class Income(models.Model):
    from_company = models.ForeignKey(Company, related_name="from_company", on_delete=models.CASCADE)
    contract_date = models.DateField()
    contract_number = models.CharField(max_length=255)
    invoice_date = models.DateField()
    invoice_number = models.CharField(max_length=255)
    unit_of_measure = models.CharField(max_length=255)
    total = models.FloatField()
    is_archive = models.BooleanField(default=True)

    def __str__(self):
        return self.contract_number


class Outcome(models.Model):
    to_company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="to_company")
    contract_date = models.DateField()
    contract_number = models.CharField(max_length=255)
    invoice_date = models.DateField()
    invoice_number = models.CharField(max_length=255)
    unit_of_measure = models.CharField(max_length=255)
    total = models.FloatField()
    is_archive = models.BooleanField(default=False)

    def __str__(self):
        return self.contract_number
