"""
Мини-тесты правил: viewer/operator, двойное списание, удаление только после архива, stock.
"""
from django.test import TestCase
from django.contrib.auth.models import Group
from django.db.models import Count, Q
from rest_framework.test import APIClient
from rest_framework import status
from warehouse.models import CustomUser, Company, Product, ProductMarking, Income, Outcome


def create_user(username, password, group_name=None):
    user = CustomUser.objects.create_user(username=username, password=password)
    if group_name:
        group = Group.objects.get(name=group_name)
        user.groups.add(group)
    return user


class ViewerOperatorPermissionsTest(TestCase):
    """viewer не может POST/PATCH/DELETE; operator может."""

    def setUp(self):
        Group.objects.get_or_create(name='viewer')
        Group.objects.get_or_create(name='operator')
        self.viewer = create_user('viewer_user', 'pass', 'viewer')
        self.operator = create_user('operator_user', 'pass', 'operator')
        self.company = Company.objects.create(name='Test Co', phone='1', inn='1')
        self.product = Product.objects.create(name='P', price=1.0, kpi='kpi')
        self.income = Income.objects.create(
            from_company=self.company,
            contract_date='2024-01-01',
            contract_number='1',
            invoice_date='2024-01-01',
            invoice_number='1',
            unit_of_measure='шт',
            total=100.0,
            is_archive=True,
        )
        self.marking = ProductMarking.objects.create(
            marking='MARK-001',
            income=self.income,
            product=self.product,
        )
        self.client = APIClient()

    def test_viewer_cannot_post_income(self):
        self.client.force_authenticate(user=self.viewer)
        data = {
            'from_company': {'name': 'C', 'phone': '1', 'inn': '1'},
            'contract_date': '2024-01-01',
            'contract_number': '2',
            'invoice_date': '2024-01-01',
            'invoice_number': '2',
            'unit_of_measure': 'шт',
            'total': 200.0,
            'products': [],
        }
        response = self.client.post('/api/v1/incomes/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_patch_income(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.patch(
            f'/api/v1/incomes/{self.income.id}/',
            {'contract_number': '1-upd'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_delete_income(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.delete(f'/api/v1/incomes/{self.income.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_post_outcome(self):
        self.client.force_authenticate(user=self.viewer)
        data = {
            'to_company': {'name': 'C2', 'phone': '2', 'inn': '2'},
            'contract_date': '2024-01-01',
            'contract_number': '1',
            'invoice_date': '2024-01-01',
            'invoice_number': '1',
            'unit_of_measure': 'шт',
            'total': 50.0,
            'product_markings': [self.marking.id],
        }
        response = self.client.post('/api/v1/outcomes/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_operator_can_patch_income(self):
        self.client.force_authenticate(user=self.operator)
        response = self.client.patch(
            f'/api/v1/incomes/{self.income.id}/',
            {'contract_number': '1-upd'},
            format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST))


class DoubleWriteOffTest(TestCase):
    """Нельзя списать маркировку дважды."""

    def setUp(self):
        Group.objects.get_or_create(name='operator')
        self.operator = create_user('operator2', 'pass', 'operator')
        self.client = APIClient()
        self.client.force_authenticate(user=self.operator)
        self.company = Company.objects.create(name='Co', phone='1', inn='1')
        self.product = Product.objects.create(name='P', price=1.0, kpi='k')
        self.income = Income.objects.create(
            from_company=self.company,
            contract_date='2024-01-01',
            contract_number='1',
            invoice_date='2024-01-01',
            invoice_number='1',
            unit_of_measure='шт',
            total=100.0,
            is_archive=True,
        )
        self.marking = ProductMarking.objects.create(
            marking='MARK-DOUBLE',
            income=self.income,
            product=self.product,
        )
        self.to_company = Company.objects.create(name='ToCo', phone='2', inn='2')

    def test_cannot_write_off_marking_twice(self):
        payload = {
            'to_company': {'name': self.to_company.name, 'phone': self.to_company.phone, 'inn': self.to_company.inn},
            'contract_date': '2024-01-01',
            'contract_number': 'O1',
            'invoice_date': '2024-01-01',
            'invoice_number': 'O1',
            'unit_of_measure': 'шт',
            'total': 50.0,
            'product_markings': [self.marking.id],
        }
        r1 = self.client.post('/api/v1/outcomes/', payload, format='json')
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        r2 = self.client.post('/api/v1/outcomes/', payload, format='json')
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)


class DeleteOnlyWhenArchivedTest(TestCase):
    """Нельзя удалить неархивированный документ (400); архивированный можно (204)."""

    def setUp(self):
        Group.objects.get_or_create(name='operator')
        self.operator = create_user('operator3', 'pass', 'operator')
        self.client = APIClient()
        self.client.force_authenticate(user=self.operator)
        self.company = Company.objects.create(name='Co', phone='1', inn='1')
        self.income_not_archived = Income.objects.create(
            from_company=self.company,
            contract_date='2024-01-01',
            contract_number='N1',
            invoice_date='2024-01-01',
            invoice_number='N1',
            unit_of_measure='шт',
            total=100.0,
            is_archive=False,
        )
        self.income_archived = Income.objects.create(
            from_company=self.company,
            contract_date='2024-01-01',
            contract_number='A1',
            invoice_date='2024-01-01',
            invoice_number='A1',
            unit_of_measure='шт',
            total=100.0,
            is_archive=True,
        )
        self.to_company = Company.objects.create(name='ToCo', phone='2', inn='2')
        self.outcome_not_archived = Outcome.objects.create(
            to_company=self.to_company,
            contract_date='2024-01-01',
            contract_number='ON1',
            invoice_date='2024-01-01',
            invoice_number='ON1',
            unit_of_measure='шт',
            total=50.0,
            is_archive=False,
        )
        self.outcome_archived = Outcome.objects.create(
            to_company=self.to_company,
            contract_date='2024-01-01',
            contract_number='OA1',
            invoice_date='2024-01-01',
            invoice_number='OA1',
            unit_of_measure='шт',
            total=50.0,
            is_archive=True,
        )

    def test_cannot_delete_non_archived_income(self):
        response = self.client.delete(f'/api/v1/incomes/{self.income_not_archived.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_delete_archived_income(self):
        response = self.client.delete(f'/api/v1/incomes/{self.income_archived.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_delete_non_archived_outcome(self):
        response = self.client.delete(f'/api/v1/outcomes/{self.outcome_not_archived.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_delete_archived_outcome(self):
        response = self.client.delete(f'/api/v1/outcomes/{self.outcome_archived.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class ProductStockTest(TestCase):
    """stock = число ProductMarking у продукта с outcome IS NULL."""

    def setUp(self):
        self.company = Company.objects.create(name='C', phone='1', inn='1')
        self.product = Product.objects.create(name='P', price=1.0, kpi='k')
        self.income = Income.objects.create(
            from_company=self.company,
            contract_date='2024-01-01',
            contract_number='1',
            invoice_date='2024-01-01',
            invoice_number='1',
            unit_of_measure='шт',
            total=100.0,
            is_archive=True,
        )
        self.to_company = Company.objects.create(name='To', phone='2', inn='2')

    def test_stock_matches_free_markings(self):
        """stock должен совпадать с числом ProductMarking у продукта с outcome IS NULL."""
        m1 = ProductMarking.objects.create(marking='M1', income=self.income, product=self.product)
        m2 = ProductMarking.objects.create(marking='M2', income=self.income, product=self.product)
        m3 = ProductMarking.objects.create(marking='M3', income=self.income, product=self.product)
        outcome = Outcome.objects.create(
            to_company=self.to_company,
            contract_date='2024-01-01',
            contract_number='O1',
            invoice_date='2024-01-01',
            invoice_number='O1',
            unit_of_measure='шт',
            total=50.0,
            is_archive=False,
        )
        ProductMarking.objects.filter(id=m2.id).update(outcome=outcome)
        qs = Product.objects.annotate(
            stock=Count('product', filter=Q(product__outcome__isnull=True))
        ).filter(id=self.product.id)
        product_with_stock = qs.first()
        self.assertIsNotNone(product_with_stock)
        # Ожидаем 2 свободные маркировки (m1, m3); m2 списана (outcome не NULL).
        expected_free = ProductMarking.objects.filter(product=self.product, outcome__isnull=True).count()
        self.assertEqual(expected_free, 2)
        self.assertEqual(product_with_stock.stock, expected_free)
