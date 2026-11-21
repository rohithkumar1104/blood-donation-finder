
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.serializers import ModelSerializer

from .models import State, District, SubDistrict


class StateSerializer(ModelSerializer):
    class Meta:
        model = State
        fields = ["id", "lgd_code", "name", "is_union_territory"]


class DistrictSerializer(ModelSerializer):
    class Meta:
        model = District
        fields = ["id", "lgd_code", "name", "state"]


class SubDistrictSerializer(ModelSerializer):
    class Meta:
        model = SubDistrict
        fields = ["id", "lgd_code", "name", "district"]


class StateListView(generics.ListAPIView):
    queryset = State.objects.all().order_by("name")
    serializer_class = StateSerializer
    permission_classes = [AllowAny]


class DistrictListView(generics.ListAPIView):
    serializer_class = DistrictSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        state_id = self.request.query_params.get("state")

        if not state_id or not state_id.isdigit():
            return District.objects.none()

        return District.objects.filter(
            state_id=state_id
        ).order_by("name")


class SubDistrictListView(generics.ListAPIView):
    serializer_class = SubDistrictSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        district_id = self.request.query_params.get("district")

        if not district_id or not district_id.isdigit():
            return SubDistrict.objects.none()

        return SubDistrict.objects.filter(
            district_id=district_id
        ).order_by("name")
