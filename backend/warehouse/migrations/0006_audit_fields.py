# Аудит: created_at, updated_at; archived_at, archived_by для Income/Outcome/ProductMarking

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('warehouse', '0005_add_invoice_date_indexes'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='productmarking',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='productmarking',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='income',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='income',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='income',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='income',
            name='archived_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='archived_incomes',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='outcome',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='outcome',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='outcome',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='outcome',
            name='archived_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='archived_outcomes',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
