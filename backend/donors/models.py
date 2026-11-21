from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from blood_groups.models import BloodGroup
from locations.models import SubDistrict


class DonorProfile(models.Model):

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"

    class Availability(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        UNAVAILABLE = "UNAVAILABLE", "Unavailable"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="donor_profile",
    )

    full_name = models.CharField(
        max_length=120,
        null=True,
        blank=True,
    )

    phone_number = models.CharField(
        max_length=10,
        unique=True,
        validators=[
            RegexValidator(
                regex=r"^[6-9]\d{9}$",
                message="Enter a valid 10-digit Indian mobile number.",
            )
        ],
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )

    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        null=True,
        blank=True,
    )

    blood_group = models.ForeignKey(
        BloodGroup,
        on_delete=models.PROTECT,
        related_name="donors",
    )

    weight_kg = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        validators=[
            MinValueValidator(
                Decimal("45"),
                message="Donors must weigh at least 45 kg.",
            )
        ],
        null=True,
        blank=True,
    )

    sub_district = models.ForeignKey(
        SubDistrict,
        on_delete=models.PROTECT,
        related_name="donors",
        null=True,
        blank=True,
    )

    last_donation_date = models.DateField(
        null=True,
        blank=True,
    )

    availability = models.CharField(
        max_length=12,
        choices=Availability.choices,
        default=Availability.UNAVAILABLE,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name or 'Unnamed donor'} ({self.blood_group})"
