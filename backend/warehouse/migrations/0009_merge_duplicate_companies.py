# Слияние дубликатов Company перед добавлением unique на inn.
# 1) По ИНН: оставляем одну запись с минимальным id, остальные приходы/расходы переназначаем, дубликаты удаляем.
# 2) По (name, phone) при пустом ИНН: то же самое.
# Пустые строки inn -> None делаем в следующей миграции после AlterField (null=True).

from django.db import migrations


def merge_duplicate_companies(apps, schema_editor):
    Company = apps.get_model("warehouse", "Company")
    Income = apps.get_model("warehouse", "Income")
    Outcome = apps.get_model("warehouse", "Outcome")

    # Дубликаты по ИНН (где ИНН не пустой)
    from django.db.models import Count, Min

    inn_dupes = (
        Company.objects.exclude(inn__isnull=True)
        .exclude(inn="")
        .values("inn")
        .annotate(cnt=Count("id"), min_id=Min("id"))
        .filter(cnt__gt=1)
    )
    for row in inn_dupes:
        main_id = row["min_id"]
        duplicate_ids = list(
            Company.objects.filter(inn=row["inn"]).exclude(id=main_id).values_list("id", flat=True)
        )
        Income.objects.filter(from_company_id__in=duplicate_ids).update(from_company_id=main_id)
        Outcome.objects.filter(to_company_id__in=duplicate_ids).update(to_company_id=main_id)
        Company.objects.filter(id__in=duplicate_ids).delete()

    # Дубликаты по (name, phone) при пустом ИНН
    from django.db.models import Q, Min

    name_phone_dupes = (
        Company.objects.filter(Q(inn__isnull=True) | Q(inn=""))
        .values("name", "phone")
        .annotate(cnt=Count("id"), min_id=Min("id"))
        .filter(cnt__gt=1)
    )
    for row in name_phone_dupes:
        main_id = row["min_id"]
        duplicate_ids = list(
            Company.objects.filter(
                Q(inn__isnull=True) | Q(inn=""),
                name=row["name"],
                phone=row["phone"],
            )
            .exclude(id=main_id)
            .values_list("id", flat=True)
        )
        Income.objects.filter(from_company_id__in=duplicate_ids).update(from_company_id=main_id)
        Outcome.objects.filter(to_company_id__in=duplicate_ids).update(to_company_id=main_id)
        Company.objects.filter(id__in=duplicate_ids).delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("warehouse", "0008_productmarking_income_index"),
    ]

    operations = [
        migrations.RunPython(merge_duplicate_companies, noop),
    ]
