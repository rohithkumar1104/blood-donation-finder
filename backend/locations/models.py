
from django.db import models


class State(models.Model):
    lgd_code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=150, unique=True)
    is_union_territory = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class District(models.Model):
    state = models.ForeignKey(
        State,
        on_delete=models.CASCADE,
        related_name="districts",
    )
    lgd_code = models.CharField(max_length=20)
    name = models.CharField(max_length=150)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["state", "lgd_code"],
                name="unique_district_code_per_state",
            ),
            models.UniqueConstraint(
                fields=["state", "name"],
                name="unique_district_name_per_state",
            ),
        ]

    def __str__(self):
        return f"{self.name}, {self.state.name}"


class SubDistrict(models.Model):
    district = models.ForeignKey(
        District,
        on_delete=models.CASCADE,
        related_name="sub_districts",
    )
    lgd_code = models.CharField(max_length=20)
    name = models.CharField(max_length=150)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["district", "lgd_code"],
                name="unique_subdistrict_code_per_district",
            ),
            models.UniqueConstraint(
                fields=["district", "name"],
                name="unique_subdistrict_name_per_district",
            ),
        ]

    def __str__(self):
        return f"{self.name}, {self.district.name}"
