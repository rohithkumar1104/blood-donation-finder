from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.serializers import ModelSerializer

from .models import BloodGroup


class BloodGroupSerializer(ModelSerializer):
    class Meta:
        model = BloodGroup
        fields = ["id", "code", "name", "abo_group", "rh_factor"]


class BloodGroupListView(generics.ListAPIView):
    queryset = BloodGroup.objects.all().order_by("id")
    serializer_class = BloodGroupSerializer
    permission_classes = [AllowAny]