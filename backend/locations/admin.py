
from django.contrib import admin

from .models import State, District, SubDistrict


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ("name", "lgd_code", "is_union_territory")
    search_fields = ("name", "lgd_code")
    list_filter = ("is_union_territory",)


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ("name", "state", "lgd_code")
    search_fields = ("name", "lgd_code", "state__name")
    list_filter = ("state",)


@admin.register(SubDistrict)
class SubDistrictAdmin(admin.ModelAdmin):
    list_display = ("name", "district", "lgd_code")
    search_fields = ("name", "lgd_code", "district__name")
    list_filter = ("district__state",)
