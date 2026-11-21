
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from blood_requests.models import BloodRequest, DirectBloodRequest
from donors.models import DonorProfile


class ChatConversation(models.Model):
    """Private conversation between a requester and a selected donor."""

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_conversations_as_requester",
    )

    donor = models.ForeignKey(
        DonorProfile,
        on_delete=models.PROTECT,
        related_name="chat_conversations",
    )

    # A conversation belongs to either a direct or public request.
    direct_request = models.OneToOneField(
        DirectBloodRequest,
        on_delete=models.CASCADE,
        related_name="chat_conversation",
        null=True,
        blank=True,
    )

    blood_request = models.ForeignKey(
        BloodRequest,
        on_delete=models.CASCADE,
        related_name="chat_conversations",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Unassignment closes the chat without deleting its message history.
    is_closed = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(direct_request__isnull=False, blood_request__isnull=True)
                    | Q(direct_request__isnull=True, blood_request__isnull=False)
                ),
                name="chat_exactly_one_request",
            ),
            models.UniqueConstraint(
                fields=["blood_request", "donor"],
                condition=Q(blood_request__isnull=False),
                name="unique_public_request_donor_chat",
            ),
        ]

    def clean(self):
        super().clean()
        errors = {}

        if self.direct_request_id:
            direct = self.direct_request

            if direct.status not in {
                DirectBloodRequest.Status.ACCEPTED,
                DirectBloodRequest.Status.COMPLETED,
            }:
                errors["direct_request"] = (
                    "Chat is available only after the donor accepts."
                )

            if direct.requester_id != self.requester_id:
                errors["requester"] = (
                    "Requester does not match the direct request."
                )

            if direct.donor_id != self.donor_id:
                errors["donor"] = (
                    "Donor does not match the direct request."
                )

        if self.blood_request_id:
            public = self.blood_request

            if public.status not in {
                BloodRequest.Status.DONOR_FOUND,
                BloodRequest.Status.COMPLETED,
            }:
                errors["blood_request"] = (
                    "Chat is available only after a donor is selected."
                )

            if public.requester_id != self.requester_id:
                errors["requester"] = (
                    "Requester does not match the public request."
                )

            if public.accepted_donor_id != self.donor_id:
                errors["donor"] = "This donor has not been selected."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return (
            f"Chat #{self.id}: {self.requester.username} "
            f"and {self.donor.full_name}"
        )


class ChatMessage(models.Model):
    """A message sent inside a private conversation."""

    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_chat_messages",
    )

    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["conversation", "created_at"],
                name="chat_msg_conv_created_idx",
            ),
        ]

    def clean(self):
        super().clean()

        if not self.conversation_id or not self.sender_id:
            return

        is_requester = (
            self.sender_id == self.conversation.requester_id
        )
        is_donor = (
            self.sender_id == self.conversation.donor.user_id
        )

        if not (is_requester or is_donor):
            raise ValidationError({
                "sender": (
                    "Only conversation participants can send messages."
                )
            })

    def __str__(self):
        return (
            f"Message #{self.id} "
            f"in conversation #{self.conversation_id}"
        )
