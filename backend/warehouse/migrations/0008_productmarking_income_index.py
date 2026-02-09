# Индекс по income_id для эндпоинта available (фильтр outcome__isnull, income__is_archive).
# outcome_id и product_id уже проиндексированы в 0004_add_db_indexes.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0007_income_is_archive_default_false'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productmarking',
            name='income',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name='income',
                to='warehouse.income',
                db_index=True,
            ),
        ),
    ]
