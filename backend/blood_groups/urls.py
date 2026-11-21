from django.urls import path
from .views import BloodGroupListView

urlpatterns = [
    path(
        "",
        BloodGroupListView.as_view(),
        name="blood-group-list",
    ),
]