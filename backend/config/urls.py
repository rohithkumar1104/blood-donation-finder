
"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/auth/", include("accounts.urls")),
    path("api/donors/", include("donors.urls")),
    path("api/blood-groups/", include("blood_groups.urls")),
    path("api/locations/", include("locations.urls")),
    path("api/chats/", include("chats.urls")),

    # Blood request APIs
    path("api/blood-requests/", include("blood_requests.urls")),

    path("api/notifications/", include("notifications.urls")),
]
