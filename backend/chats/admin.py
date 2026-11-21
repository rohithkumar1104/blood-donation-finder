
from django.contrib import admin

from chats.models import ChatConversation, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = (
        "sender",
        "message",
        "is_read",
        "created_at",
    )
    can_delete = False
    ordering = ("created_at",)


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "requester",
        "donor",
        "direct_request",
        "blood_request",
        "created_at",
        "updated_at",
    )

    list_filter = ("created_at", "updated_at")
    search_fields = (
        "requester__username",
        "requester__email",
        "donor__full_name",
        "donor__phone_number",
    )

    readonly_fields = ("created_at", "updated_at")
    inlines = [ChatMessageInline]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "sender",
        "is_read",
        "created_at",
    )

    list_filter = ("is_read", "created_at")
    search_fields = (
        "sender__username",
        "message",
        "conversation__requester__username",
        "conversation__donor__full_name",
    )

    readonly_fields = ("created_at",)
