from rest_framework import serializers

from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(
        source="actor.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "actor",
            "actor_name",
            "related_direct_request",
            "related_blood_request",
            "related_conversation",
            "related_message",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields