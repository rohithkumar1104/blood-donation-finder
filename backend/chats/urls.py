
from django.urls import path

from chats.views import (
    MyConversationsView,
    IncomingMessagesView,
    OpenDirectChatView,
    OpenPublicChatView,
    ConversationMessagesView,
    UnassignConversationView,
)

urlpatterns = [
    # List all conversations of the logged-in user
    path(
        "conversations/",
        MyConversationsView.as_view(),
        name="my-conversations",
    ),

    # Retrieve incoming messages for global notifications
    path(
        "incoming-messages/",
        IncomingMessagesView.as_view(),
        name="incoming-messages",
    ),

    # Open chat for an accepted direct blood request
    path(
        "direct/<int:request_id>/",
        OpenDirectChatView.as_view(),
        name="open-direct-chat",
    ),

    # Open chat for a selected public-request donor
    path(
        "public/<int:request_id>/",
        OpenPublicChatView.as_view(),
        name="open-public-chat",
    ),

    # Read and send messages
    path(
        "conversations/<int:conversation_id>/messages/",
        ConversationMessagesView.as_view(),
        name="conversation-messages",
    ),

    # Unassign the donor/requester and close the conversation
    path(
        "conversations/<int:conversation_id>/unassign/",
        UnassignConversationView.as_view(),
        name="unassign-conversation",
    ),
]
