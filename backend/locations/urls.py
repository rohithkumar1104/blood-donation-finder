
from django.urls import path

from .views import (
    StateListView,
    DistrictListView,
    SubDistrictListView,
)

urlpatterns = [
    path("states/", StateListView.as_view(), name="state-list"),
    path("districts/", DistrictListView.as_view(), name="district-list"),
    path("sub-districts/", SubDistrictListView.as_view(), name="sub-district-list"),
]
