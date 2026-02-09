# unique=True, null=True, blank=True для Company.inn.
# После AlterField нормализуем пустую строку в None (несколько NULL допустимы, несколько '' — нет).

from django.db import migrations, models


def normalize_empty_inn(apps, schema_editor):
    Company = apps.get_model("warehouse", "Company")
    Company.objects.filter(inn="").update(inn=None)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("warehouse", "0009_merge_duplicate_companies"),
    ]

    operations = [
        migrations.AlterField(
            model_name="company",
            name="inn",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.RunPython(normalize_empty_inn, noop),
    ]
