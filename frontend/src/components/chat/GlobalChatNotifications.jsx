import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatApiRequest } from "./chatApi";
import { notificationApiRequest } from "../notifications/notificationApi";

const CHECK_INTERVAL = 5000;
const MAX_NOTIFICATIONS = 4;
const DISMISSED_NOTIFICATIONS_KEY = "dismissedChatNotificationIds";

function getDismissedIds() {
  try {
    const storedIds = JSON.parse(
      localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || "[]",
    );

    return new Set(Array.isArray(storedIds) ? storedIds.map(String) : []);
  } catch {
    return new Set();
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case "CHAT_MESSAGE":
      return "💬";

    case "DIRECT_REQUEST_RECEIVED":
    case "PUBLIC_REQUEST_VOLUNTEERED":
      return "🩸";

    case "DIRECT_REQUEST_ACCEPTED":
    case "PUBLIC_DONOR_SELECTED":
      return "✅";

    case "DIRECT_REQUEST_DECLINED":
      return "❌";

    case "DIRECT_REQUEST_WITHDRAWN":
    case "PUBLIC_REQUEST_CANCELLED":
      return "⚠️";

    default:
      return "🔔";
  }
}

function GlobalChatNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const dismissedIds = useRef(getDismissedIds());

  const rememberDismissed = (id) => {
    dismissedIds.current.add(String(id));

    try {
      localStorage.setItem(
        DISMISSED_NOTIFICATIONS_KEY,
        JSON.stringify([...dismissedIds.current]),
      );
    } catch (error) {
      console.error("Failed to save dismissed notifications:", error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const checkNotifications = async () => {
      if (!localStorage.getItem("authToken")) {
        setNotifications([]);

        window.dispatchEvent(
          new CustomEvent("chat-unread-count", {
            detail: 0,
          }),
        );

        return;
      }

      // Fetch persistent notifications.
      try {
        const data = await notificationApiRequest();

        if (cancelled) return;

        const notificationList = Array.isArray(data.notifications)
          ? data.notifications
          : [];

        const unreadNotifications = notificationList.filter(
          (notification) =>
            !notification.is_read &&
            !dismissedIds.current.has(String(notification.id)),
        );

        setNotifications(unreadNotifications.slice(0, MAX_NOTIFICATIONS));
      } catch (error) {
        if (!cancelled) {
          console.error("Notification check failed:", error);
        }
      }

      // Update the unread chat message indicator.
      try {
        const data = await chatApiRequest("conversations/");

        if (cancelled) return;

        const conversations = Array.isArray(data) ? data : data?.results || [];

        const unreadCount = conversations.reduce(
          (total, conversation) =>
            total + Number(conversation.unread_count || 0),
          0,
        );

        window.dispatchEvent(
          new CustomEvent("chat-unread-count", {
            detail: unreadCount,
          }),
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Unread message count check failed:", error);
        }
      }
    };

    checkNotifications();

    const interval = setInterval(checkNotifications, CHECK_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const openNotification = async (notification) => {
    // Remember it locally so it does not reappear after a page refresh.
    rememberDismissed(notification.id);

    // Remove notification from visible cards.
    setNotifications((current) =>
      current.filter((item) => String(item.id) !== String(notification.id)),
    );

    // Mark notification as read.
    try {
      await notificationApiRequest(`${notification.id}/read/`, "POST");
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }

    // Every notification opens the existing Inbox page.
    if (
      notification.notification_type === "CHAT_MESSAGE" &&
      notification.related_conversation
    ) {
      navigate("/inbox", {
        state: {
          conversationId: notification.related_conversation,
        },
      });
    } else {
      navigate("/inbox", {
        state: {
          notificationId: notification.id,
          notificationType: notification.notification_type,
        },
      });
    }
  };

  const dismissNotification = (id) => {
    rememberDismissed(id);

    setNotifications((current) =>
      current.filter((item) => String(item.id) !== String(id)),
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-3">
      {notifications.map((notification) => {
        const type = notification.notification_type;

        return (
          <div
            key={notification.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg">
                {getNotificationIcon(type)}
              </div>

              <button
                type="button"
                onClick={() => openNotification(notification)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="font-semibold text-gray-900">
                  {notification.title}
                </p>

                <p className="mt-1 break-words text-sm text-gray-600">
                  {notification.message}
                </p>

                <p className="mt-2 text-xs font-semibold text-red-600">
                  Open Inbox →
                </p>
              </button>

              <button
                type="button"
                onClick={() => dismissNotification(notification.id)}
                aria-label="Dismiss notification"
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default GlobalChatNotifications;
