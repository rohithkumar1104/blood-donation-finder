
import re
from datetime import date

from rest_framework import serializers

from .models import DonorProfile


def calculate_age(born):
    today = date.today()
    age = today.year - born.year

    if (today.month, today.day) < (born.month, born.day):
        age -= 1

    return age


class DonorProfileSerializer(serializers.ModelSerializer):
    blood_group_name = serializers.CharField(
        source="blood_group.name",
        read_only=True,
    )
    sub_district_name = serializers.CharField(
        source="sub_district.name",
        read_only=True,
    )
    district_name = serializers.CharField(
        source="sub_district.district.name",
        read_only=True,
    )
    state_name = serializers.CharField(
        source="sub_district.district.state.name",
        read_only=True,
    )
    district_id = serializers.IntegerField(
        source="sub_district.district_id",
        read_only=True,
    )
    state_id = serializers.IntegerField(
        source="sub_district.district.state_id",
        read_only=True,
    )

    class Meta:
        model = DonorProfile
        fields = [
            "id",
            "full_name",
            "phone_number",
            "date_of_birth",
            "gender",
            "blood_group",
            "blood_group_name",
            "weight_kg",
            "sub_district",
            "sub_district_name",
            "district_id",
            "district_name",
            "state_id",
            "state_name",
            "last_donation_date",
            "availability",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "blood_group_name",
            "sub_district_name",
            "district_id",
            "district_name",
            "state_id",
            "state_name",
            "created_at",
            "updated_at",
        ]

    def validate_full_name(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Enter your full name."
            )

        return value

    def validate_phone_number(self, value):
        digits = re.sub(r"\D", "", value)

        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]

        if not re.fullmatch(r"[6-9]\d{9}", digits):
            raise serializers.ValidationError(
                "Enter a valid 10-digit Indian mobile number."
            )

        return digits

    def validate_date_of_birth(self, value):
        age = calculate_age(value)

        if age < 18 or age > 65:
            raise serializers.ValidationError(
                "Donors must be between 18 and 65 years old."
            )

        return value

    def validate_last_donation_date(self, value):
        if value and value > date.today():
            raise serializers.ValidationError(
                "Last donation date cannot be in the future."
            )

        return value


class DonorSearchSerializer(serializers.ModelSerializer):
    blood_group_name = serializers.CharField(
        source="blood_group.name",
        read_only=True,
    )
    sub_district_name = serializers.CharField(
        source="sub_district.name",
        read_only=True,
    )
    district_name = serializers.CharField(
        source="sub_district.district.name",
        read_only=True,
    )
    state_name = serializers.CharField(
        source="sub_district.district.state.name",
        read_only=True,
    )

    class Meta:
        model = DonorProfile
        fields = [
            "id",
            "full_name",
            "blood_group_name",
            "sub_district_name",
            "district_name",
            "state_name",
            "availability",
        ]
