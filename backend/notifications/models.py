from django.conf import settings
from django.db import models


class Notification(models.Model):

    class NotificationType(models.TextChoices):
        CHAT_MESSAGE = "CHAT_MESSAGE", "New chat message"

        DIRECT_REQUEST_RECEIVED = (
            "DIRECT_REQUEST_RECEIVED",
            "New direct blood request",
        )
        DIRECT_REQUEST_ACCEPTED = (
            "DIRECT_REQUEST_ACCEPTED",
            "Direct request accepted",
        )
        DIRECT_REQUEST_DECLINED = (
            "DIRECT_REQUEST_DECLINED",
            "Direct request declined",
        )
        DIRECT_REQUEST_WITHDRAWN = (
            "DIRECT_REQUEST_WITHDRAWN",
            "Direct request withdrawn",
        )

        PUBLIC_REQUEST_VOLUNTEERED = (
            "PUBLIC_REQUEST_VOLUNTEERED",
            "New donor volunteer",
        )
        PUBLIC_DONOR_SELECTED = (
            "PUBLIC_DONOR_SELECTED",
            "Selected for blood request",
        )
        PUBLIC_REQUEST_CANCELLED = (
            "PUBLIC_REQUEST_CANCELLED",
            "Public request cancelled",
        )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
    )

    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )

    title = models.CharField(max_length=150)
    message = models.TextField()

    related_direct_request = models.ForeignKey(
        "blood_requests.DirectBloodRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    related_blood_request = models.ForeignKey(
        "blood_requests.BloodRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    related_conversation = models.ForeignKey(
        "chats.ChatConversation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    related_message = models.ForeignKey(
        "chats.ChatMessage",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "is_read", "-created_at"],
                name="notif_recipient_read_idx",
            ),
        ]

    def __str__(self):
        return f"{self.title} - {self.recipient}"