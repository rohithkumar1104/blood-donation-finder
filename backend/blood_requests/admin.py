from django.contrib import admin

from .models import BloodRequest, DirectBloodRequest, PublicRequestVolunteer

admin.site.register(BloodRequest)
admin.site.register(DirectBloodRequest)
admin.site.register(PublicRequestVolunteer)