
from django.conf import settings
from django.db import models

from blood_groups.models import BloodGroup
from locations.models import Locality


class DonorProfile(models.Model):
    class Availability(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        UNAVAILABLE = "UNAVAILABLE", "Unavailable"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="donor_profile",
    )
    blood_group = models.ForeignKey(
        BloodGroup,
        on_delete=models.PROTECT,
        related_name="donors",
    )
    phone_number = models.CharField(max_length=20)
    locality = models.ForeignKey(
        Locality,
        on_delete=models.PROTECT,
        related_name="donors",
    )
    availability = models.CharField(
        max_length=12,
        choices=Availability.choices,
        default=Availability.UNAVAILABLE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.blood_group.name}"
