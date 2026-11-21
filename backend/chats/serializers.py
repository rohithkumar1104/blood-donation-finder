
from rest_framework import serializers

from chats.models import ChatConversation, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serialize individual chat messages."""

    sender_name = serializers.CharField(
        source="sender.username",
        read_only=True,
    )

    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_name",
            "message",
            "is_read",
            "is_mine",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "conversation",
            "sender",
            "sender_name",
            "is_read",
            "is_mine",
            "created_at",
        ]

    def get_is_mine(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return obj.sender_id == request.user.id

    def validate_message(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Message cannot be empty."
            )

        if len(value) > 5000:
            raise serializers.ValidationError(
                "Message cannot exceed 5000 characters."
            )

        return value


class ChatConversationSerializer(serializers.ModelSerializer):
    """Serialize chat conversations and participant information."""

    donor_name = serializers.CharField(
        source="donor.full_name",
        read_only=True,
    )

    requester_name = serializers.CharField(
        source="requester.username",
        read_only=True,
    )

    other_participant_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            "id",
            "requester",
            "requester_name",
            "donor",
            "donor_name",
            "other_participant_name",
            "direct_request",
            "blood_request",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_other_participant_name(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        if request.user.id == obj.requester_id:
            return obj.donor.full_name if obj.donor else None

        if request.user.id == obj.donor.user_id:
            return (
                obj.requester.get_full_name()
                or obj.requester.username
            )

        return None

    def get_last_message(self, obj):
        message = (
            obj.messages.select_related("sender")
            .order_by("-created_at", "-id")
            .first()
        )

        if message is None:
            return None

        request = self.context.get("request")

        return {
            "id": message.id,
            "message": message.message,
            "sender": message.sender.username,
            "is_mine": (
                request is not None
                and request.user.is_authenticated
                and message.sender_id == request.user.id
            ),
            "created_at": message.created_at,
        }

    def get_unread_count(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return 0

        return obj.messages.filter(
            is_read=False
        ).exclude(
            sender_id=request.user.id
        ).count()
