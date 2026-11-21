
from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from blood_requests.models import (
    BloodRequest,
    DirectBloodRequest,
    PublicRequestVolunteer,
)

from chats.models import ChatConversation, ChatMessage
from chats.serializers import (
    ChatConversationSerializer,
    ChatMessageSerializer,
)

from notifications.models import Notification
from notifications.utils import create_notification


class MyConversationsView(APIView):
    """List open conversations belonging to the logged-in user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = ChatConversation.objects.filter(
            Q(requester=request.user)
            | Q(donor__user=request.user),
            is_closed=False,
        ).filter(
            Q(
                direct_request__status__in=[
                    DirectBloodRequest.Status.ACCEPTED,
                    DirectBloodRequest.Status.COMPLETED,
                ]
            )
            | Q(
                blood_request__status__in=[
                    BloodRequest.Status.DONOR_FOUND,
                    BloodRequest.Status.COMPLETED,
                ],
                blood_request__accepted_donor_id=F("donor_id"),
            )
        ).select_related(
            "requester",
            "donor",
            "donor__user",
            "direct_request",
            "blood_request",
        ).order_by("-updated_at")

        serializer = ChatConversationSerializer(
            conversations,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)


class IncomingMessagesView(APIView):
    """Return incoming messages from open conversations."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        after_id = request.query_params.get("after_id")

        if after_id is not None:
            try:
                after_id = int(after_id)
                if after_id < 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response(
                    {"detail": "after_id must be a non-negative integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        conversations = ChatConversation.objects.filter(
            Q(requester=request.user)
            | Q(donor__user=request.user),
            is_closed=False,
        ).filter(
            Q(
                direct_request__status__in=[
                    DirectBloodRequest.Status.ACCEPTED,
                    DirectBloodRequest.Status.COMPLETED,
                ]
            )
            | Q(
                blood_request__status__in=[
                    BloodRequest.Status.DONOR_FOUND,
                    BloodRequest.Status.COMPLETED,
                ],
                blood_request__accepted_donor_id=F("donor_id"),
            )
        )

        incoming_messages = ChatMessage.objects.filter(
            conversation__in=conversations
        ).exclude(
            sender=request.user
        )

        latest_id = (
            incoming_messages
            .order_by("-id")
            .values_list("id", flat=True)
            .first()
        ) or 0

        # First request establishes a starting point without showing
        # notifications for old messages.
        if after_id is None:
            return Response({
                "messages": [],
                "latest_id": latest_id,
            })

        messages = incoming_messages.filter(
            id__gt=after_id
        ).select_related(
            "sender",
            "conversation",
        ).order_by("id")

        serializer = ChatMessageSerializer(
            messages,
            many=True,
            context={"request": request},
        )

        return Response({
            "messages": serializer.data,
            "latest_id": latest_id,
        })


class OpenDirectChatView(APIView):
    """Open or create a chat for an accepted direct request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        with transaction.atomic():
            direct_request = get_object_or_404(
                DirectBloodRequest.objects.select_for_update().select_related(
                    "requester",
                    "donor",
                    "donor__user",
                ),
                id=request_id,
            )

            is_requester = (
                direct_request.requester_id == request.user.id
            )
            is_donor = (
                direct_request.donor.user_id == request.user.id
            )

            if not (is_requester or is_donor):
                return Response(
                    {
                        "detail": (
                            "You are not a participant in this request."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            if direct_request.status not in {
                DirectBloodRequest.Status.ACCEPTED,
                DirectBloodRequest.Status.COMPLETED,
            }:
                return Response(
                    {
                        "detail": (
                            "Chat is available only after the donor accepts."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            conversation, created = (
                ChatConversation.objects.get_or_create(
                    direct_request=direct_request,
                    defaults={
                        "requester": direct_request.requester,
                        "donor": direct_request.donor,
                    },
                )
            )

            if conversation.is_closed:
                return Response(
                    {"detail": "This conversation has been closed."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = ChatConversationSerializer(
            conversation,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )


class OpenPublicChatView(APIView):
    """Open or create a chat with the donor selected for a public request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        with transaction.atomic():
            blood_request = get_object_or_404(
                BloodRequest.objects.select_for_update(
                    of=("self",)
                ).select_related(
                    "requester",
                    "accepted_donor",
                    "accepted_donor__user",
                ),
                id=request_id,
            )

            donor = blood_request.accepted_donor

            if donor is None:
                return Response(
                    {
                        "detail": (
                            "No donor has been selected for this request."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            is_requester = (
                blood_request.requester_id == request.user.id
            )
            is_donor = donor.user_id == request.user.id

            if not (is_requester or is_donor):
                return Response(
                    {
                        "detail": (
                            "You are not a participant in this request."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            if blood_request.status not in {
                BloodRequest.Status.DONOR_FOUND,
                BloodRequest.Status.COMPLETED,
            }:
                return Response(
                    {
                        "detail": (
                            "Chat is not available for this request."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            conversation, created = (
                ChatConversation.objects.get_or_create(
                    blood_request=blood_request,
                    donor=donor,
                    defaults={
                        "requester": blood_request.requester,
                    },
                )
            )

            if conversation.is_closed:
                return Response(
                    {"detail": "This conversation has been closed."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = ChatConversationSerializer(
            conversation,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )


class ConversationMessagesView(APIView):
    """Read and send messages in an authorized open conversation."""

    permission_classes = [IsAuthenticated]

    def get_conversation(self, request, conversation_id):
        conversation = get_object_or_404(
            ChatConversation.objects.select_related(
                "requester",
                "donor",
                "donor__user",
                "direct_request",
                "blood_request",
            ),
            id=conversation_id,
        )

        # Check whether the logged-in user is a participant.
        is_requester = (
            conversation.requester_id == request.user.id
        )

        is_donor = (
            conversation.donor_id is not None
            and conversation.donor.user_id == request.user.id
        )

        if not (is_requester or is_donor):
            return None

        # Closed conversations cannot be read or used to send messages.
        if conversation.is_closed:
            return None

        # Validate direct request conversations.
        if conversation.direct_request_id:
            direct_request = conversation.direct_request

            if direct_request.status not in {
                DirectBloodRequest.Status.ACCEPTED,
                DirectBloodRequest.Status.COMPLETED,
            }:
                return None

            if (
                conversation.requester_id != direct_request.requester_id
                or conversation.donor_id != direct_request.donor_id
            ):
                return None

        # Validate public request conversations.
        if conversation.blood_request_id:
            blood_request = conversation.blood_request

            if blood_request.status not in {
                BloodRequest.Status.DONOR_FOUND,
                BloodRequest.Status.COMPLETED,
            }:
                return None

            if (
                conversation.requester_id != blood_request.requester_id
                or conversation.donor_id != blood_request.accepted_donor_id
            ):
                return None

        return conversation

    def get(self, request, conversation_id):
        conversation = self.get_conversation(
            request,
            conversation_id,
        )

        if conversation is None:
            return Response(
                {
                    "detail": (
                        "You do not have access to this conversation."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Mark messages from the other participant as read.
        conversation.messages.filter(
            is_read=False
        ).exclude(
            sender=request.user
        ).update(
            is_read=True
        )

        messages = conversation.messages.select_related(
            "sender"
        ).all()

        serializer = ChatMessageSerializer(
            messages,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    @transaction.atomic
    def post(self, request, conversation_id):
        conversation = self.get_conversation(
            request,
            conversation_id,
        )

        if conversation is None:
            return Response(
                {
                    "detail": (
                        "You do not have access to this conversation."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ChatMessageSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        message = serializer.save(
            conversation=conversation,
            sender=request.user,
        )

        # Identify the other participant in the conversation.
        if conversation.requester_id == request.user.id:
            recipient = conversation.donor.user
        else:
            recipient = conversation.requester

        # Create a persistent notification for the recipient.
        create_notification(
            recipient=recipient,
            actor=request.user,
            notification_type=Notification.NotificationType.CHAT_MESSAGE,
            title="New Chat Message",
            message=(
                f"{request.user.username} sent you a new message."
            ),
            related_conversation=conversation,
            related_message=message,
        )

        conversation.save(update_fields=["updated_at"])

        response_serializer = ChatMessageSerializer(
            message,
            context={"request": request},
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class UnassignConversationView(APIView):
    """Unassign a donor/requester and close their conversation."""

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, conversation_id):
        conversation = get_object_or_404(
            ChatConversation.objects.select_for_update().select_related(
                "requester",
                "donor",
            ),
            id=conversation_id,
        )

        is_requester = conversation.requester_id == request.user.id
        is_donor = conversation.donor.user_id == request.user.id

        if not (is_requester or is_donor):
            return Response(
                {
                    "detail": (
                        "You are not a participant in this conversation."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if conversation.is_closed:
            return Response(
                {"detail": "This conversation is already closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        # Direct request: cancel the accepted request.
        if conversation.direct_request_id:
            direct_request = DirectBloodRequest.objects.select_for_update().get(
                id=conversation.direct_request_id
            )

            if direct_request.status != DirectBloodRequest.Status.ACCEPTED:
                return Response(
                    {
                        "detail": (
                            "Only an accepted direct request can be unassigned."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            direct_request.status = DirectBloodRequest.Status.CANCELLED
            direct_request.save(update_fields=["status", "updated_at"])

        # Public request: withdraw the selected donor and reopen the request.
        elif conversation.blood_request_id:
            blood_request = BloodRequest.objects.select_for_update().get(
                id=conversation.blood_request_id
            )

            if (
                blood_request.status != BloodRequest.Status.DONOR_FOUND
                or blood_request.accepted_donor_id != conversation.donor_id
            ):
                return Response(
                    {
                        "detail": (
                            "This donor is no longer assigned to the request."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            PublicRequestVolunteer.objects.filter(
                blood_request=blood_request,
                donor_id=conversation.donor_id,
                status=PublicRequestVolunteer.Status.ACTIVE,
            ).update(
                status=PublicRequestVolunteer.Status.WITHDRAWN,
                updated_at=now,
            )

            blood_request.accepted_donor = None
            blood_request.status = BloodRequest.Status.OPEN
            blood_request.save(
                update_fields=["accepted_donor", "status", "updated_at"]
            )

        conversation.is_closed = True
        conversation.closed_at = now
        conversation.save(
            update_fields=["is_closed", "closed_at", "updated_at"]
        )

        return Response(
            {
                "detail": (
                    "The assignment was cancelled and the conversation was closed."
                ),
                "conversation_id": conversation.id,
                "is_closed": conversation.is_closed,
            },
            status=status.HTTP_200_OK,
        )
