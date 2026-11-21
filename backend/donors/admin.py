from django.contrib import admin

from .models import DonorProfile


@admin.register(DonorProfile)
class DonorProfileAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "blood_group",
        "sub_district",
        "availability",
        "created_at",
    )

    list_filter = (
        "blood_group",
        "availability",
        "gender",
    )

    search_fields = (
        "full_name",
        "phone_number",
        "user__username",
        "sub_district__name",
    )