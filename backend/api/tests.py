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

    def test_cannot_put_archived_income(self):
        """Архивный приход: PUT → 400 (редактирование запрещено)."""
        data = {
            'from_company': {'name': self.company.name, 'phone': self.company.phone, 'inn': self.company.inn},
            'contract_date': '2024-01-01',
            'contract_number': 'A1',
            'invoice_date': '2024-01-01',
            'invoice_number': 'A1',
            'unit_of_measure': 'шт',
            'total': 100.0,
            'products': [],
        }
        response = self.client.put(
            f'/api/v1/incomes/{self.income_archived.id}/',
            data,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('error', {}).get('code'), 'ARCHIVED')

    def test_cannot_patch_archived_income(self):
        """Архивный приход: PATCH → 400 (редактирование запрещено)."""
        response = self.client.patch(
            f'/api/v1/incomes/{self.income_archived.id}/',
            {'contract_number': 'changed'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('error', {}).get('code'), 'ARCHIVED')

    def test_cannot_put_archived_outcome(self):
        """Архивный расход: PUT → 400 (редактирование запрещено)."""
        data = {
            'to_company': {'name': self.to_company.name, 'phone': self.to_company.phone, 'inn': self.to_company.inn},
            'contract_date': '2024-01-01',
            'contract_number': 'OA1',
            'invoice_date': '2024-01-01',
            'invoice_number': 'OA1',
            'unit_of_measure': 'шт',
            'total': 50.0,
        }
        response = self.client.put(
            f'/api/v1/outcomes/{self.outcome_archived.id}/',
            data,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('error', {}).get('code'), 'ARCHIVED')

    def test_cannot_patch_archived_outcome(self):
        """Архивный расход: PATCH → 400 (редактирование запрещено)."""
        response = self.client.patch(
            f'/api/v1/outcomes/{self.outcome_archived.id}/',
            {'contract_number': 'changed'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('error', {}).get('code'), 'ARCHIVED')


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


class OutcomeUpdateAtomicTest(TestCase):
    """Атомарность update расхода: конфликт при привязке уже списанной маркировки; detach/attach не сносит маркировки."""

    def setUp(self):
        Group.objects.get_or_create(name='operator')
        self.operator = create_user('operator_outcome_atomic', 'pass', 'operator')
        self.client = APIClient()
        self.client.force_authenticate(user=self.operator)
        self.company = Company.objects.create(name='OutCo', phone='1', inn='1')
        self.to_company = Company.objects.create(name='ToCo', phone='2', inn='2')
        self.product = Product.objects.create(name='P', price=1.0, kpi='k')
        self.income = Income.objects.create(
            from_company=self.company,
            contract_date='2024-01-01',
            contract_number='I1',
            invoice_date='2024-01-01',
            invoice_number='I1',
            unit_of_measure='шт',
            total=100.0,
            is_archive=False,
        )
        self.m1 = ProductMarking.objects.create(marking='OM1', income=self.income, product=self.product)
        self.m2 = ProductMarking.objects.create(marking='OM2', income=self.income, product=self.product)
        self.m3 = ProductMarking.objects.create(marking='OM3', income=self.income, product=self.product)

    def test_update_attach_already_written_off_marking_fails(self):
        """Привязка к расходу маркировки, уже списанной в другом расходе → 400 и список конфликтных."""
        outcome_a = Outcome.objects.create(
            to_company=self.to_company,
            contract_date='2024-01-01',
            contract_number='OA',
            invoice_date='2024-01-01',
            invoice_number='OA',
            unit_of_measure='шт',
            total=10.0,
            is_archive=False,
        )
        outcome_b = Outcome.objects.create(
            to_company=self.to_company,
            contract_date='2024-01-01',
            contract_number='OB',
            invoice_date='2024-01-01',
            invoice_number='OB',
            unit_of_measure='шт',
            total=10.0,
            is_archive=False,
        )
        ProductMarking.objects.filter(id=self.m1.id).update(outcome=outcome_a)
        ProductMarking.objects.filter(id=self.m2.id).update(outcome=outcome_b)
        # Пытаемся в outcome_a добавить m2 (уже на outcome_b) → конфликт
        payload = {
            'to_company': {'name': self.to_company.name, 'phone': self.to_company.phone, 'inn': self.to_company.inn},
            'contract_date': '2024-01-01',
            'contract_number': 'OA',
            'invoice_date': '2024-01-01',
            'invoice_number': 'OA',
            'unit_of_measure': 'шт',
            'total': 10.0,
            'product_markings': [self.m1.id, self.m2.id],
        }
        response = self.client.put(
            f'/api/v1/outcomes/{outcome_a.id}/',
            payload,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Единый формат ошибок: error.details.product_markings
        details = response.data.get('error', {}).get('details') or response.data
        self.assertIn('product_markings', details)
        self.m1.refresh_from_db()
        self.m2.refresh_from_db()
        self.assertEqual(self.m1.outcome_id, outcome_a.id)
        self.assertEqual(self.m2.outcome_id, outcome_b.id)

    def test_update_detach_attach_sync(self):
        """PATCH: меняем номер счёта и список маркировок (detach одну, attach другую) — маркировки в консистентном состоянии."""
        outcome = Outcome.objects.create(
            to_company=self.to_company,
            contract_date='2024-01-01',
            contract_number='OC',
            invoice_date='2024-01-01',
            invoice_number='OC',
            unit_of_measure='шт',
            total=10.0,
            is_archive=False,
        )
        ProductMarking.objects.filter(id__in=[self.m1.id, self.m2.id]).update(outcome=outcome)
        # PATCH: оставить m1, отвязать m2, привязать m3 + поменять номер счёта
        payload = {
            'to_company': {'name': self.to_company.name, 'phone': self.to_company.phone, 'inn': self.to_company.inn},
            'contract_date': '2024-01-01',
            'contract_number': 'OC',
            'invoice_date': '2024-01-01',
            'invoice_number': 'OC-UPD',
            'unit_of_measure': 'шт',
            'total': 10.0,
            'product_markings': [self.m1.id, self.m3.id],
        }
        response = self.client.patch(
            f'/api/v1/outcomes/{outcome.id}/',
            payload,
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        outcome.refresh_from_db()
        self.assertEqual(outcome.invoice_number, 'OC-UPD')
        ids = list(outcome.product_markings.values_list('id', flat=True))
        self.assertCountEqual(ids, [self.m1.id, self.m3.id])
        self.m2.refresh_from_db()
        self.assertIsNone(self.m2.outcome_id)


class WrittenOffMarkingNoUpdateDeleteTest(TestCase):
    """Списанная маркировка (outcome != null): нельзя менять текст, удалять, перепривязывать."""

    def setUp(self):
        Group.objects.get_or_create(name='operator')
        self.operator = create_user('operator_written_off', 'pass', 'operator')
        self.client = APIClient()
        self.client.force_authenticate(user=self.operator)
        self.company = Company.objects.create(name='Co', phone='1', inn='1')
        self.to_company = Company.objects.create(name='ToCo', phone='2', inn='2')
        self.product = Product.objects.create(name='P', price=1.0, kpi='k')
        self.income = Income.objects.create(
            from_company=self.company,
            contract_date='2024-01-01',
            contract_number='I1',
            invoice_date='2024-01-01',
            invoice_number='I1',
            unit_of_measure='шт',
            total=100.0,
            is_archive=False,
        )
        self.marking = ProductMarking.objects.create(
            marking='WRITTEN-OFF-M1',
            income=self.income,
            product=self.product,
        )
        self.outcome = Outcome.objects.create(
            to_company=self.to_company,
            contract_date='2024-01-01',
            contract_number='O1',
            invoice_date='2024-01-01',
            invoice_number='O1',
            unit_of_measure='шт',
            total=10.0,
            is_archive=False,
        )
        ProductMarking.objects.filter(id=self.marking.id).update(outcome=self.outcome)

    def test_cannot_update_written_off_marking_via_put(self):
        """PUT маркировки, уже списанной в расход → 400 MARKING_WRITTEN_OFF."""
        url = f'/api/v1/incomes/{self.income.id}/products/{self.product.id}/markings/{self.marking.id}/'
        response = self.client.put(url, {'marking': 'CHANGED', 'counter': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('error', {}).get('code'), 'MARKING_WRITTEN_OFF')
        self.marking.refresh_from_db()
        self.assertEqual(self.marking.marking, 'WRITTEN-OFF-M1')

    def test_cannot_delete_written_off_marking(self):
        """DELETE маркировки, уже списанной в расход → 400 MARKING_WRITTEN_OFF."""
        url = f'/api/v1/incomes/{self.income.id}/products/{self.product.id}/markings/{self.marking.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('error', {}).get('code'), 'MARKING_WRITTEN_OFF')
        self.assertTrue(ProductMarking.objects.filter(id=self.marking.id).exists())


class TokenRefreshContractTest(TestCase):
    """
    Контракт refresh для фронта: 401/400 = «сессия истекла», редирект на логин.
    Сеть/5xx = не редиректить. Этот тест фиксирует: невалидный refresh → 401.
    """

    def setUp(self):
        Group.objects.get_or_create(name='operator')
        self.user = create_user('refresh_test_user', 'pass', 'operator')
        self.client = APIClient()

    def test_refresh_with_invalid_token_returns_401(self):
        """Невалидный или пустой refresh → 401. Фронт по 401/400 показывает «Сессия истекла» и редирект."""
        response = self.client.post(
            '/api/v1/token/refresh/',
            {'refresh': 'invalid-or-expired-token'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_with_missing_refresh_returns_400(self):
        """Без поля refresh → 400. Фронт трактует 400 от refresh как «сессия истекла»."""
        response = self.client.post(
            '/api/v1/token/refresh/',
            {},
            format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))

    def test_refresh_with_valid_token_returns_200_and_access(self):
        """Валидный refresh → 200 и access в ответе. Регрессия: не сломать успешный refresh."""
        login_response = self.client.post(
            '/api/v1/token/',
            {'username': 'refresh_test_user', 'password': 'pass'},
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        refresh = login_response.data.get('refresh')
        self.assertTrue(refresh, 'login must return refresh token')
        response = self.client.post(
            '/api/v1/token/refresh/',
            {'refresh': refresh},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertTrue(response.data['access'], 'must return new access token')
