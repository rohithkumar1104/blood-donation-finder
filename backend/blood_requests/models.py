from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from blood_groups.models import BloodGroup
from donors.models import DonorProfile
from locations.models import Locality


class BloodRequest(models.Model):
    class Urgency(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        URGENT = "URGENT", "Urgent"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        DONOR_FOUND = "DONOR_FOUND", "Donor Found"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blood_requests",
    )
    blood_group = models.ForeignKey(
        BloodGroup,
        on_delete=models.PROTECT,
        related_name="blood_requests",
    )
    locality = models.ForeignKey(
        Locality,
        on_delete=models.PROTECT,
        related_name="blood_requests",
    )
    units_needed = models.PositiveSmallIntegerField()
    hospital_name = models.CharField(max_length=200)
    hospital_address = models.CharField(max_length=300, blank=True)
    urgency = models.CharField(
        max_length=10,
        choices=Urgency.choices,
        default=Urgency.NORMAL,
    )
    required_by = models.DateTimeField()
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.OPEN,
    )
    accepted_donor = models.ForeignKey(
        DonorProfile,
        on_delete=models.SET_NULL,
        related_name="accepted_blood_requests",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(units_needed__gte=1),
                name="public_request_units_at_least_one",
            ),
        ]

    def clean(self):
        super().clean()
        errors = {}

        if self.units_needed is not None and self.units_needed < 1:
            errors["units_needed"] = (
                "At least one unit must be requested."
            )

        if (
            self.accepted_donor_id
            and self.status not in {
                self.Status.DONOR_FOUND,
                self.Status.COMPLETED,
                self.Status.CANCELLED,
            }
        ):
            errors["status"] = (
                "A selected donor requires the status "
                "'Donor Found', 'Completed', or 'Cancelled'."
            )

        if (
            self.status == self.Status.DONOR_FOUND
            and not self.accepted_donor_id
        ):
            errors["accepted_donor"] = (
                "A request with status 'Donor Found' must have "
                "a selected donor."
            )

        if (
            self.accepted_donor_id
            and self.accepted_donor.user_id == self.requester_id
        ):
            errors["accepted_donor"] = (
                "You cannot select yourself as the donor."
            )

        if (
            self.accepted_donor_id
            and self.accepted_donor.blood_group_id
            != self.blood_group_id
        ):
            errors["accepted_donor"] = (
                "The selected donor's blood group must match "
                "the requested blood group."
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return (
            f"{self.blood_group.name} blood request "
            f"by {self.requester.username}"
        )


class PublicRequestVolunteer(models.Model):
    """Tracks donors volunteering for a public blood request."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Volunteering"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"

    blood_request = models.ForeignKey(
        BloodRequest,
        on_delete=models.CASCADE,
        related_name="volunteers",
    )
    donor = models.ForeignKey(
        DonorProfile,
        on_delete=models.CASCADE,
        related_name="public_request_volunteers",
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["blood_request", "donor"],
                name="unique_public_request_volunteer",
            ),
        ]

    def clean(self):
        super().clean()
        errors = {}

        if self.blood_request_id and self.donor_id:
            if self.blood_request.requester_id == self.donor.user_id:
                errors["donor"] = (
                    "You cannot volunteer for your own blood request."
                )

            if (
                self.blood_request.blood_group_id
                != self.donor.blood_group_id
            ):
                errors["donor"] = (
                    "The donor's blood group must match the "
                    "requested blood group."
                )

            if (
                self.donor.availability
                != DonorProfile.Availability.AVAILABLE
            ):
                errors["donor"] = (
                    "Only available donors can volunteer."
                )

            if self.blood_request.status != BloodRequest.Status.OPEN:
                errors["blood_request"] = (
                    "You can only volunteer for an open blood request."
                )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return (
            f"{self.donor.user.username} volunteering for "
            f"request #{self.blood_request_id}"
        )


class DirectBloodRequest(models.Model):
    """A private blood request sent to one specific donor."""

    class Urgency(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        URGENT = "URGENT", "Urgent"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        DECLINED = "DECLINED", "Declined"
        CANCELLED = "CANCELLED", "Cancelled"
        COMPLETED = "COMPLETED", "Completed"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="direct_blood_requests",
    )
    donor = models.ForeignKey(
        DonorProfile,
        on_delete=models.PROTECT,
        related_name="direct_blood_requests",
    )
    blood_group = models.ForeignKey(
        BloodGroup,
        on_delete=models.PROTECT,
        related_name="direct_blood_requests",
    )
    units_needed = models.PositiveSmallIntegerField()
    hospital_name = models.CharField(max_length=200)
    hospital_address = models.CharField(max_length=300)
    urgency = models.CharField(
        max_length=10,
        choices=Urgency.choices,
        default=Urgency.NORMAL,
    )
    required_by = models.DateTimeField()
    details = models.TextField(blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(units_needed__gte=1),
                name="direct_request_units_at_least_one",
            ),
            models.UniqueConstraint(
                fields=["donor"],
                condition=Q(status="ACCEPTED"),
                name="one_accepted_direct_request_per_donor",
            ),
        ]

    def clean(self):
        super().clean()
        errors = {}

        if self.units_needed is not None and self.units_needed < 1:
            errors["units_needed"] = (
                "At least one unit must be requested."
            )

        if (
            self.requester_id
            and self.donor_id
            and self.requester_id == self.donor.user_id
        ):
            errors["donor"] = (
                "You cannot request blood from yourself."
            )

        if (
            self.donor_id
            and self.blood_group_id
            and self.blood_group_id != self.donor.blood_group_id
        ):
            errors["blood_group"] = (
                "The requested blood group must match the donor's "
                "registered blood group."
            )

        if (
            self.donor_id
            and self.status == self.Status.ACCEPTED
            and self.donor.availability
            != DonorProfile.Availability.AVAILABLE
        ):
            errors["donor"] = (
                "Only available donors can accept a direct request."
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return (
            f"Direct blood request from {self.requester.username} "
            f"to {self.donor.user.username}"
        )
