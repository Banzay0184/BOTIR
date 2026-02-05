from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth.models import Group


ROLE_NAMES = ('admin', 'operator', 'viewer')


@receiver(post_migrate)
def ensure_roles_exist(sender, **kwargs):
    if sender.name != 'warehouse':
        return
    for name in ROLE_NAMES:
        Group.objects.get_or_create(name=name)
