
from django.urls import path

from blood_requests.views import (
    PublicBloodRequestListCreateView,
    MyBloodRequestsView,
    MyPublicVolunteerRequestsView,
    PublicBloodRequestDetailView,
    VolunteerForPublicRequestView,
    PublicRequestVolunteersView,
    SelectPublicRequestDonorView,
    SelectedPublicDonorContactView,
    CreateDirectBloodRequestView,
    MySentDirectRequestsView,
    MyReceivedDirectRequestsView,
    RespondToDirectRequestView,
    WithdrawDirectRequestView,
    CancelPublicBloodRequestView,
)

urlpatterns = [
    # Public blood requests
    path("", PublicBloodRequestListCreateView.as_view(), name="public-blood-request-list-create"),
    path("my/", MyBloodRequestsView.as_view(), name="my-blood-requests"),
    path(
        "my-volunteering/",
        MyPublicVolunteerRequestsView.as_view(),
        name="my-public-volunteer-requests",
    ),
    path("<int:request_id>/", PublicBloodRequestDetailView.as_view(), name="public-blood-request-detail"),
    path("<int:request_id>/volunteer/", VolunteerForPublicRequestView.as_view(), name="volunteer-for-public-request"),
    path("<int:request_id>/volunteers/", PublicRequestVolunteersView.as_view(), name="public-request-volunteers"),
    path("<int:request_id>/select/<int:volunteer_id>/", SelectPublicRequestDonorView.as_view(), name="select-public-request-donor"),
    path("<int:request_id>/selected-donor-contact/", SelectedPublicDonorContactView.as_view(), name="selected-public-donor-contact"),
    path("<int:request_id>/cancel/", CancelPublicBloodRequestView.as_view(), name="cancel-public-blood-request"),

    # Direct donor requests
    path("direct/", CreateDirectBloodRequestView.as_view(), name="create-direct-blood-request"),
    path("direct/sent/", MySentDirectRequestsView.as_view(), name="my-sent-direct-requests"),
    path("direct/received/", MyReceivedDirectRequestsView.as_view(), name="my-received-direct-requests"),
    path("direct/<int:request_id>/respond/", RespondToDirectRequestView.as_view(), name="respond-to-direct-request"),
    path("direct/<int:request_id>/withdraw/", WithdrawDirectRequestView.as_view(), name="withdraw-direct-request"),
]
