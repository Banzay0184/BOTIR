from django.contrib import admin
from .models import *


admin.site.register(Company)
admin.site.register(Product)
admin.site.register(ProductMarking)
admin.site.register(Income)
admin.site.register(Outcome)
admin.site.register(CustomUser)

