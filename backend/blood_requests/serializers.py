
from django.utils import timezone
from rest_framework import serializers

from blood_requests.models import (
    BloodRequest,
    PublicRequestVolunteer,
    DirectBloodRequest,
)
from donors.models import DonorProfile



class BloodRequestSerializer(serializers.ModelSerializer):
    """Serializer for public blood requests."""

    requester_id = serializers.IntegerField(
        source="requester.id",
        read_only=True,
    )
    requester_name = serializers.CharField(
        source="requester.username",
        read_only=True,
    )
    blood_group_name = serializers.CharField(
        source="blood_group.name",
        read_only=True,
    )
    sub_district_name = serializers.CharField(
        source="sub_district.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = BloodRequest
        fields = [
            "id",
            "requester_id",
            "requester_name",
            "blood_group",
            "blood_group_name",
            "sub_district",
            "sub_district_name",
            "units_needed",
            "hospital_name",
            "hospital_address",
            "urgency",
            "required_by",
            "description",
            "status",
            "accepted_donor",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requester_id",
            "requester_name",
            "blood_group_name",
            "sub_district_name",
            "status",
            "accepted_donor",
            "created_at",
            "updated_at",
        ]

    def validate_units_needed(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "At least one unit must be requested."
            )
        return value

    def validate_required_by(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                "The required date and time must be in the future."
            )
        return value





class PublicRequestVolunteerSerializer(serializers.ModelSerializer):
    """Serializer for donors volunteering for public requests."""

    donor_id = serializers.IntegerField(
        source="donor.id",
        read_only=True,
    )
    donor_name = serializers.CharField(
        source="donor.full_name",
        read_only=True,
    )
    blood_group_name = serializers.CharField(
        source="donor.blood_group.name",
        read_only=True,
    )
    sub_district_name = serializers.CharField(
        source="donor.sub_district.name",
        read_only=True,
    )

    # Details of the public blood request
    requester_id = serializers.IntegerField(
        source="blood_request.requester_id",
        read_only=True,
    )
    requester_name = serializers.CharField(
        source="blood_request.requester.username",
        read_only=True,
    )
    request_blood_group_name = serializers.CharField(
        source="blood_request.blood_group.name",
        read_only=True,
    )
    request_units_needed = serializers.IntegerField(
        source="blood_request.units_needed",
        read_only=True,
    )
    request_hospital_name = serializers.CharField(
        source="blood_request.hospital_name",
        read_only=True,
    )
    request_hospital_address = serializers.CharField(
        source="blood_request.hospital_address",
        read_only=True,
    )
    request_urgency = serializers.CharField(
        source="blood_request.urgency",
        read_only=True,
    )
    request_required_by = serializers.DateTimeField(
        source="blood_request.required_by",
        read_only=True,
    )
    request_status = serializers.CharField(
        source="blood_request.status",
        read_only=True,
    )
    request_accepted_donor_id = serializers.IntegerField(
        source="blood_request.accepted_donor_id",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = PublicRequestVolunteer
        fields = [
            "id",
            "donor_id",
            "blood_request",
            "donor_name",
            "blood_group_name",
            "sub_district_name",
            "status",
            "created_at",
            "requester_id",
            "requester_name",
            "request_blood_group_name",
            "request_units_needed",
            "request_hospital_name",
            "request_hospital_address",
            "request_urgency",
            "request_required_by",
            "request_status",
            "request_accepted_donor_id",
        ]
        read_only_fields = fields


class DirectBloodRequestSerializer(serializers.ModelSerializer):
    """Serializer for direct requests sent to individual donors."""

    requester_name = serializers.CharField(
        source="requester.username",
        read_only=True,
    )
    donor_name = serializers.CharField(
        source="donor.full_name",
        read_only=True,
    )
    blood_group_name = serializers.CharField(
        source="blood_group.name",
        read_only=True,
    )
    donor_phone = serializers.SerializerMethodField()

    class Meta:
        model = DirectBloodRequest
        fields = [
            "id",
            "requester_name",
            "donor",
            "donor_name",
            "donor_phone",
            "blood_group",
            "blood_group_name",
            "units_needed",
            "hospital_name",
            "hospital_address",
            "urgency",
            "required_by",
            "details",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requester_name",
            "donor_name",
            "donor_phone",
            "blood_group",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_donor_phone(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        if (
            request.user == obj.requester
            and obj.status == DirectBloodRequest.Status.ACCEPTED
        ):
            return obj.donor.phone_number

        return None

    def validate_donor(self, donor):
        request = self.context.get("request")

        if request and donor.user_id == request.user.id:
            raise serializers.ValidationError(
                "You cannot send a request to yourself."
            )

        if donor.availability != DonorProfile.Availability.AVAILABLE:
            raise serializers.ValidationError(
                "This donor is currently unavailable."
            )

        return donor

    def validate_units_needed(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "At least one unit must be requested."
            )
        return value

    def validate_required_by(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                "The required date and time must be in the future."
            )
        return value
