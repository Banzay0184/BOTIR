# Generated manually for db_index on ProductMarking, Income, Outcome

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0003_alter_productmarking_counter'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productmarking',
            name='outcome',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.PROTECT,
                related_name='product_markings',
                to='warehouse.outcome',
                db_index=True,
            ),
        ),
        migrations.AlterField(
            model_name='productmarking',
            name='product',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name='product',
                to='warehouse.product',
                db_index=True,
            ),
        ),
        migrations.AlterField(
            model_name='income',
            name='contract_date',
            field=models.DateField(db_index=True),
        ),
        migrations.AlterField(
            model_name='income',
            name='is_archive',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AlterField(
            model_name='outcome',
            name='contract_date',
            field=models.DateField(db_index=True),
        ),
        migrations.AlterField(
            model_name='outcome',
            name='is_archive',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
