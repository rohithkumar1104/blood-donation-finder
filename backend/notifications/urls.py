from django.urls import path

from notifications.views import (
    NotificationListView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
)

urlpatterns = [
    path(
        "",
        NotificationListView.as_view(),
        name="notification-list",
    ),
    path(
        "<int:notification_id>/read/",
        MarkNotificationReadView.as_view(),
        name="mark-notification-read",
    ),
    path(
        "read-all/",
        MarkAllNotificationsReadView.as_view(),
        name="mark-all-notifications-read",
    ),
]