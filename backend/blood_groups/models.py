from django.db import models


class BloodGroup(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=3, unique=True)
    abo_group = models.CharField(max_length=2)
    rh_factor = models.CharField(max_length=10)

    def __str__(self):
        return self.name
