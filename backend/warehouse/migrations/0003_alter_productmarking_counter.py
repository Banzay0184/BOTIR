# Generated by Django 4.2.14 on 2024-11-06 11:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0002_productmarking_counter'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productmarking',
            name='counter',
            field=models.BooleanField(blank=True, default=False, null=True),
        ),
    ]
