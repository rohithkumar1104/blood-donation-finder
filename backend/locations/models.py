
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class Country(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=2, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "countries"

    def __str__(self):
        return f"{self.name} ({self.code})"


class AdministrativeArea(models.Model):
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="administrative_areas",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="children",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=150)
    area_type = models.CharField(
        max_length=50,
        help_text="Examples: state, province, district, county, or region.",
    )
    code = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["country", "parent", "code"],
                condition=~Q(code="") & Q(parent__isnull=False),
                name="unique_child_admin_area_code",
            ),
            models.UniqueConstraint(
                fields=["country", "code"],
                condition=Q(parent__isnull=True) & ~Q(code=""),
                name="unique_root_admin_area_code",
            ),
        ]

    def clean(self):
        super().clean()
        errors = {}

        if self.parent_id:
            if self.pk and self.parent_id == self.pk:
                errors["parent"] = (
                    "An administrative area cannot be its own parent."
                )
            else:
                parent = self.parent

                if parent.country_id != self.country_id:
                    errors["parent"] = (
                        "The parent administrative area must belong "
                        "to the same country."
                    )
                else:
                    ancestor = parent
                    visited = set()

                    while ancestor is not None:
                        if ancestor.pk in visited or (
                            self.pk is not None
                            and ancestor.pk == self.pk
                        ):
                            errors["parent"] = (
                                "Circular administrative area hierarchies "
                                "are not allowed."
                            )
                            break

                        visited.add(ancestor.pk)
                        ancestor = ancestor.parent

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.name} ({self.area_type})"


class Locality(models.Model):
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="localities",
    )
    administrative_area = models.ForeignKey(
        AdministrativeArea,
        on_delete=models.SET_NULL,
        related_name="localities",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=150)
    locality_type = models.CharField(
        max_length=30,
        help_text="Examples: city, town, village, or settlement.",
    )
    geoname_id = models.PositiveIntegerField(
        unique=True,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["name"]

    def clean(self):
        super().clean()

        if self.administrative_area_id and self.country_id:
            if self.country_id != self.administrative_area.country_id:
                raise ValidationError({
                    "administrative_area": (
                        "The administrative area must belong "
                        "to the selected country."
                    )
                })

    def __str__(self):
        return self.name
