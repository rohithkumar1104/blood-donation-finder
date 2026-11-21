import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { chatApiRequest } from "../components/chat/chatApi";

const API_URL =
  "https://blood-donation-finder-awce.onrender.com/api/blood-requests/direct/";
const TOKEN_KEY = "authToken";

const TABS = [
  { id: "sent", label: "Sent Requests" },
  { id: "received", label: "Received Requests" },
  { id: "chats", label: "Chats" },
];

function formatDate(value) {
  if (!value) return "Not specified";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusStyle(status) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "ACCEPTED":
      return "bg-green-100 text-green-800";
    case "DECLINED":
      return "bg-red-100 text-red-800";
    case "CANCELLED":
      return "bg-gray-200 text-gray-700";
    case "COMPLETED":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <p className="text-neutral-600">{children}</p>
    </div>
  );
}

function ErrorMessage({ children }) {
  if (!children) return null;

  return (
    <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {children}
    </div>
  );
}

function RequestDetails({ request, received = false }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-neutral-500">Blood group</p>
          <p className="font-semibold text-red-600">
            {request.blood_group_name || "Not specified"}
          </p>
        </div>

        <div>
          <p className="text-neutral-500">Units needed</p>
          <p className="font-semibold">{request.units_needed}</p>
        </div>

        <div>
          <p className="text-neutral-500">Hospital</p>
          <p className="font-semibold">
            {request.hospital_name || "Not specified"}
          </p>
        </div>

        <div>
          <p className="text-neutral-500">Hospital address</p>
          <p className="font-semibold">
            {request.hospital_address || "Not specified"}
          </p>
        </div>

        <div>
          <p className="text-neutral-500">Urgency</p>
          <p className="font-semibold">{request.urgency || "NORMAL"}</p>
        </div>

        <div>
          <p className="text-neutral-500">Required by</p>
          <p className="font-semibold">{formatDate(request.required_by)}</p>
        </div>

        <div>
          <p className="text-neutral-500">
            {received ? "Request received" : "Request created"}
          </p>
          <p className="font-semibold">{formatDate(request.created_at)}</p>
        </div>
      </div>

      {request.details && (
        <div className="mt-4 rounded-lg bg-neutral-50 p-3">
          <p className="mb-1 text-sm text-neutral-500">Additional details</p>
          <p className="text-sm text-neutral-700">{request.details}</p>
        </div>
      )}
    </>
  );
}

export default function Inbox() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("sent");

  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [conversations, setConversations] = useState([]);

  const [sentLoading, setSentLoading] = useState(true);
  const [receivedLoading, setReceivedLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);

  const [sentError, setSentError] = useState("");
  const [receivedError, setReceivedError] = useState("");
  const [chatsError, setChatsError] = useState("");

  const [actionLoading, setActionLoading] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const isLoadingMessages = useRef(false);
  const shouldScrollToBottom = useRef(true);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    navigate("/login");
  }, [navigate]);

  // ---------------------------------------------------------------
  // Load sent requests
  // ---------------------------------------------------------------

  const loadSentRequests = useCallback(
    async (silent = false) => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        handleUnauthorized();
        return;
      }

      if (!silent) setSentLoading(true);
      setSentError("");

      try {
        const response = await fetch(`${API_URL}sent/`, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        const data = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load sent requests.");
        }

        setSentRequests(Array.isArray(data) ? data : data.results || []);
      } catch (error) {
        setSentError(error.message || "Something went wrong.");
      } finally {
        if (!silent) setSentLoading(false);
      }
    },
    [handleUnauthorized],
  );

  // ---------------------------------------------------------------
  // Load received requests
  // ---------------------------------------------------------------

  const loadReceivedRequests = useCallback(
    async (silent = false) => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        handleUnauthorized();
        return;
      }

      if (!silent) setReceivedLoading(true);
      setReceivedError("");

      try {
        const response = await fetch(`${API_URL}received/`, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        const data = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load received requests.");
        }

        setReceivedRequests(Array.isArray(data) ? data : data.results || []);
      } catch (error) {
        setReceivedError(error.message || "Something went wrong.");
      } finally {
        if (!silent) setReceivedLoading(false);
      }
    },
    [handleUnauthorized],
  );

  // ---------------------------------------------------------------
  // Load conversations
  // ---------------------------------------------------------------

  const loadConversations = useCallback(
    async (silent = false) => {
      if (!silent) setChatsLoading(true);
      setChatsError("");

      try {
        const { response, data } = await chatApiRequest("conversations/");

        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load conversations.");
        }

        const list = Array.isArray(data) ? data : data.results || [];
        setConversations(list);

        setSelectedConversation((current) => {
          if (!current) return current;
          return list.find((item) => item.id === current.id) || null;
        });
      } catch (error) {
        setChatsError(error.message || "Unable to load chats.");
      } finally {
        if (!silent) setChatsLoading(false);
      }
    },
    [navigate],
  );

  // ---------------------------------------------------------------
  // Initial loading and automatic request refresh
  // ---------------------------------------------------------------

  useEffect(() => {
    loadSentRequests();
    loadReceivedRequests();
    loadConversations();

    const intervalId = setInterval(() => {
      loadSentRequests(true);
      loadReceivedRequests(true);
      loadConversations(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [loadSentRequests, loadReceivedRequests, loadConversations]);

  // ---------------------------------------------------------------
  // Withdraw sent request
  // ---------------------------------------------------------------

  const withdrawRequest = async (requestId) => {
    if (!window.confirm("Withdraw this blood request?")) return;

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      handleUnauthorized();
      return;
    }

    setActionLoading(requestId);
    setActionSuccess("");
    setSentError("");

    try {
      const response = await fetch(`${API_URL}${requestId}/withdraw/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Unable to withdraw request.");
      }

      setActionSuccess(data.detail || "Request withdrawn successfully.");

      await Promise.all([
        loadSentRequests(true),
        loadReceivedRequests(true),
        loadConversations(true),
      ]);

      if (Number(selectedConversation?.direct_request) === Number(requestId)) {
        setSelectedConversation(null);
        setMessages([]);
        setShowMobileChat(false);
      }
    } catch (error) {
      setSentError(error.message || "Something went wrong.");
    } finally {
      setActionLoading(null);
    }
  };

  // ---------------------------------------------------------------
  // Accept or decline received request
  // ---------------------------------------------------------------

  const respondToRequest = async (requestId, action) => {
    const confirmation =
      action === "accept"
        ? "Accept this blood request?"
        : "Decline this blood request?";

    if (!window.confirm(confirmation)) return;

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      handleUnauthorized();
      return;
    }

    setActionLoading(requestId);
    setActionSuccess("");
    setReceivedError("");

    try {
      const response = await fetch(`${API_URL}${requestId}/respond/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Unable to respond to request.");
      }

      setActionSuccess(data.detail || "Your response has been saved.");

      await Promise.all([
        loadReceivedRequests(true),
        loadSentRequests(true),
        loadConversations(true),
      ]);
    } catch (error) {
      setReceivedError(error.message || "Something went wrong.");
    } finally {
      setActionLoading(null);
    }
  };

  // ---------------------------------------------------------------
  // Load messages for selected conversation
  // ---------------------------------------------------------------

  const loadMessages = useCallback(
    async (showLoading = false) => {
      if (!selectedConversation || isLoadingMessages.current) return;

      isLoadingMessages.current = true;

      if (showLoading) setMessagesLoading(true);

      const container = messageContainerRef.current;
      const distanceFromBottom = container
        ? container.scrollHeight - container.scrollTop - container.clientHeight
        : 0;

      shouldScrollToBottom.current =
        distanceFromBottom < 120 || messages.length === 0;

      try {
        const { response, data } = await chatApiRequest(
          `conversations/${selectedConversation.id}/messages/`,
        );

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load messages.");
        }

        const list = Array.isArray(data) ? data : data.results || [];
        setMessages(list);
        setMessagesError("");
      } catch (error) {
        setMessagesError(error.message || "Unable to load messages.");
      } finally {
        isLoadingMessages.current = false;
        setMessagesLoading(false);
      }
    },
    [selectedConversation, messages.length, handleUnauthorized],
  );

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setMessagesError("");
      setMessagesLoading(false);
      return;
    }

    setMessages([]);
    setMessagesError("");
    shouldScrollToBottom.current = true;

    loadMessages(true);

    const intervalId = setInterval(() => {
      loadMessages(false);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [selectedConversation?.id, loadMessages]);

  useEffect(() => {
    if (shouldScrollToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldScrollToBottom.current = false;
    }
  }, [messages]);

  // ---------------------------------------------------------------
  // Send chat message
  // ---------------------------------------------------------------

  const sendMessage = async (event) => {
    event.preventDefault();

    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    setMessagesError("");

    try {
      const { response, data } = await chatApiRequest(
        `conversations/${selectedConversation.id}/messages/`,
        "POST",
        { message: trimmedMessage },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Unable to send message.");
      }

      setMessageText("");

      setMessages((current) => {
        if (data.id && current.some((item) => item.id === data.id)) {
          return current;
        }
        return [...current, data];
      });

      shouldScrollToBottom.current = true;
      loadConversations(true);
    } catch (error) {
      setMessagesError(error.message || "Unable to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  // ---------------------------------------------------------------
  // Select a conversation
  // ---------------------------------------------------------------

  const openConversation = (conversation) => {
    setSelectedConversation(conversation);
    setShowMobileChat(true);
    setMessageText("");
  };

  const goBackToChatList = () => {
    setShowMobileChat(false);
  };

  const activeConversation =
    conversations.find((item) => item.id === selectedConversation?.id) ||
    selectedConversation;

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/home" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-xl text-white">
              ♥
            </span>
            <span className="text-lg font-bold">BloodLink</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/my-requests"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              My Requests
            </Link>

            <Link
              to="/home"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-red-50 hover:text-red-700"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-6 rounded-3xl bg-red-600 p-6 text-white sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">My Inbox</h1>
          <p className="mt-2 text-sm text-red-100 sm:text-base">
            Manage your sent requests, received requests and conversations in
            one place.
          </p>
        </section>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-2">
          {TABS.map((tab) => {
            const count =
              tab.id === "sent"
                ? sentRequests.length
                : tab.id === "received"
                  ? receivedRequests.length
                  : conversations.length;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActionSuccess("");
                }}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-red-50 hover:text-red-700"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {actionSuccess && activeTab !== "chats" && (
          <div className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {actionSuccess}
          </div>
        )}

        {/* ------------------------------------------------------- */}
        {/* SENT REQUESTS                                           */}
        {/* ------------------------------------------------------- */}

        {activeTab === "sent" && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Sent Requests</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Track requests you have sent to donors.
                </p>
              </div>

              <button
                onClick={() => loadSentRequests()}
                disabled={sentLoading}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <ErrorMessage>{sentError}</ErrorMessage>

            {sentLoading ? (
              <EmptyState>Loading sent requests...</EmptyState>
            ) : sentRequests.length === 0 ? (
              <EmptyState>
                You haven't sent any direct blood requests yet.
              </EmptyState>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">
                          Request to {request.donor_name}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          Request #{request.id}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>

                    <RequestDetails request={request} />

                    {request.status === "PENDING" && (
                      <div className="mt-5">
                        <button
                          onClick={() => withdrawRequest(request.id)}
                          disabled={actionLoading === request.id}
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {actionLoading === request.id
                            ? "Please wait..."
                            : "Withdraw Request"}
                        </button>
                      </div>
                    )}

                    {request.status === "ACCEPTED" && (
                      <div className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                        Your request was accepted. You can chat with the donor
                        in the Chats tab.
                        <div className="mt-3">
                          <button
                            onClick={() => setActiveTab("chats")}
                            className="font-bold underline"
                          >
                            Open chats
                          </button>
                        </div>
                        <button
                          onClick={() => withdrawRequest(request.id)}
                          disabled={actionLoading === request.id}
                          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {actionLoading === request.id
                            ? "Please wait..."
                            : "Withdraw Request"}
                        </button>
                      </div>
                    )}

                    {request.status === "CANCELLED" && (
                      <p className="mt-4 text-sm text-neutral-500">
                        You withdrew this request. Chat access is no longer
                        available.
                      </p>
                    )}

                    {request.status === "DECLINED" && (
                      <p className="mt-4 text-sm text-red-600">
                        The donor declined this request.
                      </p>
                    )}

                    {request.status === "COMPLETED" && (
                      <p className="mt-4 text-sm text-blue-700">
                        This request has been completed.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------- */}
        {/* RECEIVED REQUESTS                                       */}
        {/* ------------------------------------------------------- */}

        {activeTab === "received" && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Received Requests</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Review blood requests sent to you.
                </p>
              </div>

              <button
                onClick={() => loadReceivedRequests()}
                disabled={receivedLoading}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <ErrorMessage>{receivedError}</ErrorMessage>

            {receivedLoading ? (
              <EmptyState>Loading received requests...</EmptyState>
            ) : receivedRequests.length === 0 ? (
              <EmptyState>
                You haven't received any direct blood requests yet.
              </EmptyState>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">
                          Request from {request.requester_name}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          Request #{request.id}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>

                    <RequestDetails request={request} received />

                    {request.status === "PENDING" && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={() => respondToRequest(request.id, "accept")}
                          disabled={actionLoading === request.id}
                          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === request.id
                            ? "Please wait..."
                            : "Accept Request"}
                        </button>

                        <button
                          onClick={() =>
                            respondToRequest(request.id, "decline")
                          }
                          disabled={actionLoading === request.id}
                          className="rounded-lg border border-red-300 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Decline Request
                        </button>
                      </div>
                    )}

                    {request.status === "ACCEPTED" && (
                      <div className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                        You accepted this request. You can chat with the
                        requester in the Chats tab.
                        <div className="mt-2">
                          <button
                            onClick={() => setActiveTab("chats")}
                            className="font-bold underline"
                          >
                            Open chats
                          </button>
                        </div>
                      </div>
                    )}

                    {request.status === "CANCELLED" && (
                      <p className="mt-4 text-sm text-neutral-600">
                        The requester withdrew this blood request. Chat access
                        is no longer available.
                      </p>
                    )}

                    {request.status === "DECLINED" && (
                      <p className="mt-4 text-sm text-neutral-500">
                        You declined this request.
                      </p>
                    )}

                    {request.status === "COMPLETED" && (
                      <p className="mt-4 text-sm text-blue-700">
                        This blood request has been completed.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------- */}
        {/* CHATS                                                   */}
        {/* ------------------------------------------------------- */}

        {activeTab === "chats" && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Chats</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Chat with donors and requesters after a request is accepted.
                </p>
              </div>

              <button
                onClick={() => loadConversations()}
                disabled={chatsLoading}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <ErrorMessage>{chatsError}</ErrorMessage>

            {chatsLoading ? (
              <EmptyState>Loading conversations...</EmptyState>
            ) : conversations.length === 0 ? (
              <EmptyState>
                No active conversations yet. Chats become available after a
                blood request is accepted.
              </EmptyState>
            ) : (
              <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm md:grid-cols-[320px_minmax(0,1fr)]">
                {/* Conversation list */}
                <div
                  className={`border-neutral-200 md:block md:border-r ${
                    showMobileChat ? "hidden" : "block"
                  }`}
                >
                  <div className="border-b border-neutral-200 p-4">
                    <h3 className="font-bold">Conversations</h3>
                  </div>

                  <div className="max-h-[650px] overflow-y-auto">
                    {conversations.map((conversation) => {
                      const isSelected =
                        selectedConversation?.id === conversation.id;

                      const participant =
                        conversation.other_participant_name ||
                        conversation.requester_name ||
                        "BloodLink user";

                      return (
                        <button
                          key={conversation.id}
                          onClick={() => openConversation(conversation)}
                          className={`w-full border-b border-neutral-100 p-4 text-left transition hover:bg-red-50 ${
                            isSelected ? "bg-red-50" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-semibold text-neutral-900">
                              {participant}
                            </p>

                            {conversation.unread_count > 0 && (
                              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 truncate text-sm text-neutral-500">
                            {conversation.last_message?.message ||
                              "Start a conversation"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected conversation */}
                <div
                  className={`min-w-0 flex-col ${
                    showMobileChat ? "flex" : "hidden md:flex"
                  }`}
                >
                  {!activeConversation ? (
                    <div className="flex flex-1 items-center justify-center p-8 text-center text-neutral-500">
                      Select a conversation to start chatting.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 border-b border-neutral-200 p-4">
                        <button
                          onClick={goBackToChatList}
                          className="rounded-lg px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 md:hidden"
                        >
                          ← Back
                        </button>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold">
                            {activeConversation.other_participant_name ||
                              activeConversation.requester_name ||
                              "Conversation"}
                          </h3>
                          <p className="text-xs text-green-600">
                            BloodLink conversation
                          </p>
                        </div>
                      </div>

                      <ErrorMessage>{messagesError}</ErrorMessage>

                      <div
                        ref={messageContainerRef}
                        onScroll={() => {
                          const container = messageContainerRef.current;
                          if (!container) return;

                          const distance =
                            container.scrollHeight -
                            container.scrollTop -
                            container.clientHeight;

                          shouldScrollToBottom.current = distance < 120;
                        }}
                        className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4"
                      >
                        {messagesLoading && messages.length === 0 ? (
                          <p className="py-8 text-center text-sm text-neutral-500">
                            Loading messages...
                          </p>
                        ) : messages.length === 0 ? (
                          <p className="py-8 text-center text-sm text-neutral-500">
                            No messages yet. Say hello!
                          </p>
                        ) : (
                          messages.map((item) => (
                            <div
                              key={item.id}
                              className={`flex ${
                                item.is_mine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                  item.is_mine
                                    ? "rounded-br-sm bg-red-600 text-white"
                                    : "rounded-bl-sm border border-neutral-200 bg-white text-neutral-900"
                                }`}
                              >
                                {!item.is_mine && (
                                  <p className="mb-1 text-xs font-bold text-red-600">
                                    {item.sender_name}
                                  </p>
                                )}

                                <p className="whitespace-pre-wrap break-words text-sm">
                                  {item.message}
                                </p>

                                <div
                                  className={`mt-2 flex items-center justify-end gap-2 text-[10px] ${
                                    item.is_mine
                                      ? "text-red-100"
                                      : "text-neutral-400"
                                  }`}
                                >
                                  <span>{formatDate(item.created_at)}</span>
                                  {item.is_mine && (
                                    <span>
                                      {item.is_read ? "Seen" : "Sent"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}

                        <div ref={messagesEndRef} />
                      </div>

                      <form
                        onSubmit={sendMessage}
                        className="flex gap-2 border-t border-neutral-200 bg-white p-3"
                      >
                        <input
                          type="text"
                          value={messageText}
                          onChange={(event) =>
                            setMessageText(event.target.value)
                          }
                          placeholder="Type your message..."
                          maxLength={5000}
                          className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                        />

                        <button
                          type="submit"
                          disabled={!messageText.trim() || sendingMessage}
                          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sendingMessage ? "Sending..." : "Send"}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
