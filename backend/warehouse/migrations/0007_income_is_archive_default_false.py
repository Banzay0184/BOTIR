# Новый приход создаётся неархивным (is_archive=False). Архив = заморозка после явного действия "В архив".

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0006_audit_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='income',
            name='is_archive',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
