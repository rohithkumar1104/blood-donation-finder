
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import DonorProfile
from .serializers import (
    DonorProfileSerializer,
    DonorSearchSerializer,
)


class MyDonorProfileView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = DonorProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return self.request.user.donor_profile
        except DonorProfile.DoesNotExist:
            raise NotFound("You have not created a donor profile yet.")

    def post(self, request, *args, **kwargs):
        if DonorProfile.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "You already have a donor profile."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class DonorSearchView(generics.ListAPIView):

    serializer_class = DonorSearchSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = DonorProfile.objects.filter(
            availability="AVAILABLE"
        ).select_related(
            "blood_group",
            "sub_district",
            "sub_district__district",
            "sub_district__district__state",
        )

        # Exclude the logged-in user's own profile only when authenticated.
        if self.request.user.is_authenticated:
            queryset = queryset.exclude(user=self.request.user)

        blood_group = self.request.query_params.get("blood_group")
        state = self.request.query_params.get("state")
        district = self.request.query_params.get("district")
        sub_district = self.request.query_params.get("sub_district")

        if blood_group:
            queryset = queryset.filter(
                blood_group_id=blood_group
            )

        if state:
            queryset = queryset.filter(
                sub_district__district__state_id=state
            )

        if district:
            queryset = queryset.filter(
                sub_district__district_id=district
            )

        if sub_district:
            queryset = queryset.filter(
                sub_district_id=sub_district
            )

        return queryset.order_by("full_name", "id")
