# Generated by Django 4.2.14 on 2024-09-06 02:39

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0006_outcome_income'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='outcome',
            name='income',
        ),
    ]
