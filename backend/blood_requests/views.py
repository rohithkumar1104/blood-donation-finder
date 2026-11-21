
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from blood_requests.models import (
    BloodRequest,
    PublicRequestVolunteer,
    DirectBloodRequest,
)

from blood_requests.serializers import (
    BloodRequestSerializer,
    PublicRequestVolunteerSerializer,
    DirectBloodRequestSerializer,
)

from donors.models import DonorProfile

from notifications.models import Notification
from notifications.utils import create_notification


def check_active_blood_request(user):
    """
    Prevent a requester from having more than one active
    public or direct blood request.
    """

    has_active_public_request = BloodRequest.objects.filter(
        requester=user,
        status__in=[
            BloodRequest.Status.OPEN,
            BloodRequest.Status.DONOR_FOUND,
        ],
    ).exists()

    has_active_direct_request = DirectBloodRequest.objects.filter(
        requester=user,
        status__in=[
            DirectBloodRequest.Status.PENDING,
            DirectBloodRequest.Status.ACCEPTED,
        ],
    ).exists()

    if has_active_public_request or has_active_direct_request:
        raise ValidationError({
            "detail": (
                "You already have an active blood request. "
                "Complete or cancel it before creating another."
            )
        })


# ============================================================
# PUBLIC BLOOD REQUEST VIEWS
# ============================================================


class PublicBloodRequestListCreateView(generics.ListCreateAPIView):
    """Allow anyone to view open requests, but only logged-in users to create."""

    serializer_class = BloodRequestSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return BloodRequest.objects.filter(
            status=BloodRequest.Status.OPEN
        ).select_related(
            "requester",
            "blood_group",
            "sub_district",
        ).order_by("-created_at")

    @transaction.atomic
    def perform_create(self, serializer):
        user = get_user_model().objects.select_for_update().get(
            pk=self.request.user.pk
        )

        check_active_blood_request(user)

        serializer.save(requester=user)


class MyBloodRequestsView(generics.ListAPIView):
    """List blood requests created by the logged-in user."""

    serializer_class = BloodRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BloodRequest.objects.filter(
            requester=self.request.user
        ).select_related(
            "requester",
            "blood_group",
            "sub_district",
            "accepted_donor",
        ).order_by("-created_at")


class MyPublicVolunteerRequestsView(generics.ListAPIView):
    """List public blood requests the logged-in donor has volunteered for."""

    serializer_class = PublicRequestVolunteerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PublicRequestVolunteer.objects.filter(
            donor__user=self.request.user,
        ).select_related(
            "blood_request",
            "blood_request__requester",
            "blood_request__blood_group",
            "blood_request__sub_district",
            "donor",
            "donor__user",
        ).order_by("-created_at")


class PublicBloodRequestDetailView(generics.RetrieveAPIView):
    """View one open public blood request."""

    serializer_class = BloodRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BloodRequest.objects.filter(
            status=BloodRequest.Status.OPEN
        ).select_related(
            "requester",
            "blood_group",
            "sub_district",
        )



class VolunteerForPublicRequestView(APIView):
    """Allow an available donor to volunteer for a public request."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, request_id):
        donor = get_object_or_404(
            DonorProfile.objects.select_for_update(),
            user=request.user,
        )

        blood_request = get_object_or_404(
            BloodRequest.objects.select_for_update(),
            id=request_id,
        )

        if blood_request.status != BloodRequest.Status.OPEN:
            return Response(
                {"detail": "This request is no longer open."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if blood_request.requester_id == request.user.id:
            return Response(
                {"detail": "You cannot volunteer for your own request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if donor.availability != DonorProfile.Availability.AVAILABLE:
            return Response(
                {"detail": "You are currently unavailable as a donor."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if donor.blood_group_id != blood_request.blood_group_id:
            return Response(
                {"detail": "Your blood group does not match this request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        volunteer, created = PublicRequestVolunteer.objects.get_or_create(
            blood_request=blood_request,
            donor=donor,
        )

        if (
            not created
            and volunteer.status == PublicRequestVolunteer.Status.ACTIVE
        ):
            return Response(
                {"detail": "You have already volunteered for this request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        volunteer.status = PublicRequestVolunteer.Status.ACTIVE
        volunteer.save(update_fields=["status", "updated_at"])

        # Notify the requester about the new donor volunteer.
        create_notification(
            recipient=blood_request.requester,
            actor=request.user,
            notification_type=(
                Notification.NotificationType.PUBLIC_REQUEST_VOLUNTEERED
            ),
            title="New Donor Volunteer",
            message=(
                f"{request.user.username} has volunteered "
                "for your blood request."
            ),
            related_blood_request=blood_request,
        )

        return Response(
            {
                "detail": "You have successfully volunteered.",
                "volunteer_id": volunteer.id,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

class PublicRequestVolunteersView(generics.ListAPIView):
    """Allow only the requester to see volunteers for their request."""

    serializer_class = PublicRequestVolunteerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        blood_request = get_object_or_404(
            BloodRequest,
            id=self.kwargs["request_id"],
            requester=self.request.user,
        )

        return PublicRequestVolunteer.objects.filter(
            blood_request=blood_request,
        ).select_related(
            "donor",
            "donor__user",
            "donor__blood_group",
            "donor__sub_district",
        )



class SelectPublicRequestDonorView(APIView):
    """Allow the requester to select one donor who volunteered."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, request_id, volunteer_id):
        blood_request = get_object_or_404(
            BloodRequest.objects.select_for_update(),
            id=request_id,
            requester=request.user,
        )

        if blood_request.status != BloodRequest.Status.OPEN:
            return Response(
                {"detail": "This request is no longer open."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        volunteer = get_object_or_404(
            PublicRequestVolunteer.objects.select_for_update().select_related(
                "donor",
                "donor__user",
            ),
            id=volunteer_id,
            blood_request=blood_request,
            status=PublicRequestVolunteer.Status.ACTIVE,
        )

        donor = get_object_or_404(
            DonorProfile.objects.select_for_update(),
            pk=volunteer.donor_id,
        )

        if donor.availability != DonorProfile.Availability.AVAILABLE:
            return Response(
                {"detail": "This donor is currently unavailable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if donor.blood_group_id != blood_request.blood_group_id:
            return Response(
                {"detail": "This donor's blood group no longer matches."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        blood_request.accepted_donor = donor
        blood_request.status = BloodRequest.Status.DONOR_FOUND
        blood_request.save(
            update_fields=[
                "accepted_donor",
                "status",
                "updated_at",
            ]
        )

        # Notify the selected donor.
        create_notification(
            recipient=donor.user,
            actor=request.user,
            notification_type=(
                Notification.NotificationType.PUBLIC_DONOR_SELECTED
            ),
            title="You've Been Selected",
            message=(
                f"{request.user.username} selected you "
                "for their blood request."
            ),
            related_blood_request=blood_request,
        )

        return Response(
            {
                "detail": "Donor selected successfully.",
                "selected_donor_id": donor.id,
            },
            status=status.HTTP_200_OK,
        )


class CancelPublicBloodRequestView(APIView):
    """Allow a requester to cancel their own public blood request."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, request_id):
        blood_request = get_object_or_404(
            BloodRequest.objects.select_for_update(),
            id=request_id,
            requester=request.user,
        )

        allowed_statuses = {
            BloodRequest.Status.OPEN,
            BloodRequest.Status.DONOR_FOUND,
        }

        if blood_request.status not in allowed_statuses:
            return Response(
                {
                    "detail": (
                        "This request cannot be cancelled because "
                        "it is already completed or cancelled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get active volunteers before changing their status.
        active_volunteers = list(
            PublicRequestVolunteer.objects.filter(
                blood_request=blood_request,
                status=PublicRequestVolunteer.Status.ACTIVE,
            ).select_related(
                "donor",
                "donor__user",
            )
        )

        blood_request.status = BloodRequest.Status.CANCELLED
        blood_request.save(
            update_fields=["status", "updated_at"]
        )

        # Notify every donor who volunteered for this request.
        for volunteer in active_volunteers:
            create_notification(
                recipient=volunteer.donor.user,
                actor=request.user,
                notification_type=(
                    Notification.NotificationType.PUBLIC_REQUEST_CANCELLED
                ),
                title="Blood Request Cancelled",
                message=(
                    f"{request.user.username} cancelled a blood request "
                    "you volunteered for."
                ),
                related_blood_request=blood_request,
            )

        # Withdraw all currently active donor volunteers.
        PublicRequestVolunteer.objects.filter(
            blood_request=blood_request,
            status=PublicRequestVolunteer.Status.ACTIVE,
        ).update(
            status=PublicRequestVolunteer.Status.WITHDRAWN,
            updated_at=timezone.now(),
        )

        return Response(
            {
                "detail": "Public blood request cancelled successfully.",
                "request_id": blood_request.id,
                "status": blood_request.status,
            },
            status=status.HTTP_200_OK,
        )

class SelectedPublicDonorContactView(APIView):
    """Show selected donor contact details only to the requester."""

    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        blood_request = get_object_or_404(
            BloodRequest.objects.select_related(
                "accepted_donor",
                "accepted_donor__blood_group",
                "accepted_donor__sub_district",
                "accepted_donor__sub_district__district",
                "accepted_donor__sub_district__district__state",
            ),
            id=request_id,
            requester=request.user,
        )

        if (
            blood_request.status not in {
                BloodRequest.Status.DONOR_FOUND,
                BloodRequest.Status.COMPLETED,
            }
            or not blood_request.accepted_donor
        ):
            return Response(
                {
                    "detail": (
                        "No donor has been selected for this request yet."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        donor = blood_request.accepted_donor

        return Response(
            {
                "donor_name": donor.full_name,
                "blood_group": donor.blood_group.name,
                "phone_number": donor.phone_number,
                "sub_district": donor.sub_district.name,
                "district": donor.sub_district.district.name,
                "state": donor.sub_district.district.state.name,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# DIRECT DONOR REQUEST VIEWS
# ============================================================


class CreateDirectBloodRequestView(generics.CreateAPIView):
    """Send a direct blood request to one donor."""

    serializer_class = DirectBloodRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        user = get_user_model().objects.select_for_update().get(
            pk=self.request.user.pk
        )

        check_active_blood_request(user)

        donor = serializer.validated_data["donor"]

        if donor.user_id == user.id:
            raise ValidationError({
                "donor": "You cannot send a request to yourself."
            })

        if donor.availability != DonorProfile.Availability.AVAILABLE:
            raise ValidationError({
                "donor": "This donor is currently unavailable."
            })

        direct_request = serializer.save(
            requester=user,
            blood_group=donor.blood_group,
        )

        # Notify the selected donor about the new request.
        create_notification(
            recipient=donor.user,
            actor=user,
            notification_type=(
                Notification.NotificationType.DIRECT_REQUEST_RECEIVED
            ),
            title="New Blood Request",
            message=(
                f"{user.username} has sent you a direct blood request."
            ),
            related_direct_request=direct_request,
        )


class MySentDirectRequestsView(generics.ListAPIView):
    """List direct requests sent by the logged-in user."""

    serializer_class = DirectBloodRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DirectBloodRequest.objects.filter(
            requester=self.request.user
        ).select_related(
            "requester",
            "donor",
            "donor__user",
            "donor__blood_group",
        ).order_by("-created_at")


class MyReceivedDirectRequestsView(generics.ListAPIView):
    """List direct requests received by the logged-in donor."""

    serializer_class = DirectBloodRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DirectBloodRequest.objects.filter(
            donor__user=self.request.user
        ).select_related(
            "requester",
            "donor",
            "donor__user",
            "blood_group",
        ).order_by("-created_at")


class RespondToDirectRequestView(APIView):
    """Allow the intended donor to accept or decline a request."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, request_id):
        direct_request = get_object_or_404(
            DirectBloodRequest.objects.select_for_update(),
            id=request_id,
            donor__user=request.user,
        )

        if direct_request.status != DirectBloodRequest.Status.PENDING:
            return Response(
                {"detail": "This request has already been responded to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action = request.data.get("action")

        if action == "accept":
            donor = get_object_or_404(
                DonorProfile.objects.select_for_update(),
                pk=direct_request.donor_id,
            )

            if donor.availability != DonorProfile.Availability.AVAILABLE:
                return Response(
                    {"detail": "You are currently unavailable."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if donor.blood_group_id != direct_request.blood_group_id:
                return Response(
                    {"detail": "Your blood group does not match this request."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            direct_request.status = DirectBloodRequest.Status.ACCEPTED

            try:
                with transaction.atomic():
                    direct_request.save(
                        update_fields=["status", "updated_at"]
                    )
            except IntegrityError:
                return Response(
                    {
                        "detail": (
                            "You have already accepted another "
                            "direct blood request."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            notification_type = (
                Notification.NotificationType.DIRECT_REQUEST_ACCEPTED
            )
            title = "Blood Request Accepted"
            message = (
                f"{request.user.username} has accepted your blood request."
            )

        elif action == "decline":
            direct_request.status = DirectBloodRequest.Status.DECLINED
            direct_request.save(
                update_fields=["status", "updated_at"]
            )

            notification_type = (
                Notification.NotificationType.DIRECT_REQUEST_DECLINED
            )
            title = "Blood Request Declined"
            message = (
                f"{request.user.username} has declined your blood request."
            )

        else:
            return Response(
                {"detail": "Action must be 'accept' or 'decline'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Notify the original requester about the donor's response.
        create_notification(
            recipient=direct_request.requester,
            actor=request.user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_direct_request=direct_request,
        )

        return Response(
            {
                "detail": (
                    f"Request {direct_request.status.lower()} successfully."
                ),
                "request_id": direct_request.id,
                "status": direct_request.status,
            },
            status=status.HTTP_200_OK,
        )



class WithdrawDirectRequestView(APIView):
    """
    Allow the requester to withdraw a direct request
    while it is pending or after it has been accepted.
    """

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, request_id):
        direct_request = get_object_or_404(
            DirectBloodRequest.objects.select_for_update(),
            id=request_id,
            requester=request.user,
        )

        allowed_statuses = {
            DirectBloodRequest.Status.PENDING,
            DirectBloodRequest.Status.ACCEPTED,
        }

        if direct_request.status not in allowed_statuses:
            return Response(
                {
                    "detail": (
                        "This request cannot be withdrawn because "
                        "it has already been declined, completed, "
                        "or cancelled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        direct_request.status = DirectBloodRequest.Status.CANCELLED
        direct_request.save(
            update_fields=["status", "updated_at"]
        )

        # Notify the donor that the requester withdrew the request.
        create_notification(
            recipient=direct_request.donor.user,
            actor=request.user,
            notification_type=(
                Notification.NotificationType.DIRECT_REQUEST_WITHDRAWN
            ),
            title="Blood Request Withdrawn",
            message=(
                f"{request.user.username} has withdrawn the blood request."
            ),
            related_direct_request=direct_request,
        )

        return Response(
            {
                "detail": "Blood request withdrawn successfully.",
                "request_id": direct_request.id,
                "status": direct_request.status,
            },
            status=status.HTTP_200_OK,
        )
