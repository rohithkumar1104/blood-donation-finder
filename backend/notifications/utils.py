from notifications.models import Notification


def create_notification(
    recipient,
    notification_type,
    title,
    message,
    actor=None,
    related_direct_request=None,
    related_blood_request=None,
    related_conversation=None,
    related_message=None,
):
    if not recipient:
        return None

    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        title=title,
        message=message,
        related_direct_request=related_direct_request,
        related_blood_request=related_blood_request,
        related_conversation=related_conversation,
        related_message=related_message,
    )