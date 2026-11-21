
from django.urls import path

from .views import (
    MyDonorProfileView,
    DonorSearchView,
)

urlpatterns = [
    path(
        "profile/",
        MyDonorProfileView.as_view(),
        name="donor-profile",
    ),
    path(
        "search/",
        DonorSearchView.as_view(),
        name="donor-search",
    ),
]
