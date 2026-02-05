# Индексы по датам документов (invoice_date) для фильтров и отчётов.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0004_add_db_indexes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='income',
            name='invoice_date',
            field=models.DateField(db_index=True),
        ),
        migrations.AlterField(
            model_name='outcome',
            name='invoice_date',
            field=models.DateField(db_index=True),
        ),
    ]
