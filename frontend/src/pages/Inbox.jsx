import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { chatApiRequest } from "../components/chat/chatApi";

const API_URL = "http://127.0.0.1:8000/api";
const TOKEN_KEY = "authToken";

const getListData = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const getErrorMessage = (data) =>
  data?.detail ||
  data?.message ||
  (typeof data === "string" ? data : "Something went wrong.");

const formatDate = (value) => {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const statusColors = {
  OPEN: "bg-blue-100 text-blue-700",
  DONOR_FOUND: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  WITHDRAWN: "bg-gray-100 text-gray-600",
};

function StatusBadge({ status }) {
  const value = status || "UNKNOWN";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        statusColors[value] || "bg-gray-100 text-gray-600"
      }`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-gray-800">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl">
        🩸
      </div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
    </div>
  );
}

function Inbox() {
  const navigate = useNavigate();
  const location = useLocation();

  const messagesEndRef = useRef(null);
  const attemptedConversationId = useRef(null);

  const [activeTab, setActiveTab] = useState("donor");

  const [directSent, setDirectSent] = useState([]);
  const [directReceived, setDirectReceived] = useState([]);
  const [publicCreated, setPublicCreated] = useState([]);
  const [publicVolunteering, setPublicVolunteering] = useState([]);

  const [volunteers, setVolunteers] = useState({});
  const [conversations, setConversations] = useState([]);

  const [selectedKey, setSelectedKey] = useState("");
  const [activeConversation, setActiveConversation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [sending, setSending] = useState(false);

  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    navigate("/login");
  }, [navigate]);

  const apiRequest = useCallback(
    async (endpoint, method = "GET", body = null) => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        handleUnauthorized();
        throw new Error("Please log in to continue.");
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data =
        response.status === 204
          ? null
          : await response.json().catch(() => null);

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Your session has expired. Please log in again.");
      }

      if (!response.ok) {
        const error = new Error(getErrorMessage(data));
        error.status = response.status;
        throw error;
      }

      return data;
    },
    [handleUnauthorized],
  );

  const loadData = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      handleUnauthorized();
      return;
    }

    setPageError("");

    try {
      const results = await Promise.all([
        apiRequest("/blood-requests/direct/sent/"),
        apiRequest("/blood-requests/direct/received/"),
        apiRequest("/blood-requests/my/"),
        apiRequest("/blood-requests/my-volunteering/"),
        chatApiRequest("conversations/"),
      ]);

      const sent = getListData(results[0]);
      const received = getListData(results[1]);
      const created = getListData(results[2]);
      const volunteering = getListData(results[3]);
      const chats = getListData(results[4]);

      setDirectSent(sent);
      setDirectReceived(received);
      setPublicCreated(created);
      setPublicVolunteering(volunteering);
      setConversations(chats);

      // Load donor responses for public requests created by this user.
      const volunteerResults = await Promise.all(
        created.map(async (request) => {
          try {
            const data = await apiRequest(
              `/blood-requests/${request.id}/volunteers/`,
            );

            return [request.id, getListData(data)];
          } catch {
            return [request.id, []];
          }
        }),
      );

      setVolunteers(Object.fromEntries(volunteerResults));
    } catch (error) {
      setPageError(error.message || "Unable to load your messages.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, handleUnauthorized]);

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 15000);

    return () => clearInterval(interval);
  }, [loadData]);

  const findConversation = useCallback(
    (type, requestId, donorId = null) => {
      return conversations.find((conversation) => {
        if (type === "direct") {
          return Number(conversation.direct_request) === Number(requestId);
        }

        const sameRequest =
          Number(conversation.blood_request) === Number(requestId);

        if (!sameRequest) return false;

        return (
          donorId == null || Number(conversation.donor) === Number(donorId)
        );
      });
    },
    [conversations],
  );

  const rows = useMemo(() => {
    const result = [];

    if (activeTab === "donor") {
      directReceived.forEach((request) => {
        const conversation = findConversation("direct", request.id);

        result.push({
          key: `received-${request.id}`,
          type: "directReceived",
          category: "Direct request received",
          title:
            request.requester_name ||
            request.requester?.username ||
            "Requester",
          subtitle: `${request.blood_group_name || "Blood request"} · ${
            request.hospital_name ||
            request.hospital ||
            "Hospital not specified"
          }`,
          status: request.status,
          request,
          conversation,
        });
      });

      publicVolunteering.forEach((volunteer) => {
        const requestId = volunteer.blood_request;

        const selected =
          volunteer.request_accepted_donor_id != null &&
          Number(volunteer.request_accepted_donor_id) ===
            Number(volunteer.donor_id);

        const conversation = selected
          ? findConversation("public", requestId, volunteer.donor_id)
          : null;

        result.push({
          key: `volunteer-${volunteer.id}`,
          type: "publicVolunteer",
          category: "Public request volunteered for",
          title: volunteer.requester_name || "Requester",
          subtitle: `${
            volunteer.request_blood_group_name || "Blood request"
          } · ${volunteer.request_hospital_name || "Hospital not specified"}`,
          status: volunteer.status,
          request: volunteer,
          conversation,
          selected,
        });
      });
    } else {
      directSent.forEach((request) => {
        const conversation = findConversation("direct", request.id);

        result.push({
          key: `sent-${request.id}`,
          type: "directSent",
          category: "Direct request sent",
          title: request.donor_name || request.donor?.full_name || "Donor",
          subtitle: `${request.blood_group_name || "Blood request"} · ${
            request.hospital_name ||
            request.hospital ||
            "Hospital not specified"
          }`,
          status: request.status,
          request,
          conversation,
        });
      });

      publicCreated.forEach((request) => {
        const conversation = findConversation("public", request.id);

        result.push({
          key: `public-${request.id}`,
          type: "publicCreated",
          category: "Public request created",
          title: request.blood_group_name || "Public blood request",
          subtitle: `${request.hospital_name || "Hospital not specified"} · ${
            request.units_needed ?? request.units ?? "?"
          } unit(s)`,
          status: request.status,
          request,
          conversation,
        });
      });
    }

    return result;
  }, [
    activeTab,
    directReceived,
    publicVolunteering,
    directSent,
    publicCreated,
    findConversation,
  ]);

  const selectedRow = rows.find((row) => row.key === selectedKey) || null;

  // Open a conversation when navigating from a chat notification.
  useEffect(() => {
    const requestedConversationId = location.state?.conversationId;

    if (!requestedConversationId || !rows.length) return;

    const matchingRow = rows.find(
      (row) => Number(row.conversation?.id) === Number(requestedConversationId),
    );

    if (matchingRow) {
      setSelectedKey(matchingRow.key);
      setActiveConversation(matchingRow.conversation);
      setMessages([]);
      setMessagesError("");
      setActionError("");
      setActionSuccess("");
      setShowMobileDetail(true);

      attemptedConversationId.current = null;

      // Clear navigation state after selecting the conversation.
      navigate(location.pathname, {
        replace: true,
        state: null,
      });

      return;
    }

    // The conversation may belong to the other Inbox tab.
    if (attemptedConversationId.current !== String(requestedConversationId)) {
      attemptedConversationId.current = String(requestedConversationId);

      setActiveTab((current) => (current === "donor" ? "requester" : "donor"));
    }
  }, [rows, location.state, location.pathname, navigate]);

  // Select the first request when no notification navigation is pending.
  useEffect(() => {
    // Do not override a conversation being opened from a notification.
    if (location.state?.conversationId) return;

    if (!rows.length) {
      setSelectedKey("");
      setActiveConversation(null);
      setShowMobileDetail(false);
      return;
    }

    if (!rows.some((row) => row.key === selectedKey)) {
      setSelectedKey(rows[0].key);
      setActiveConversation(rows[0].conversation || null);
      setMessages([]);
      setMessagesError("");
    }
  }, [rows, selectedKey, location.state?.conversationId]);

  const canOpenChat = (row) => {
    if (!row) return false;

    const status =
      row.type === "publicVolunteer"
        ? row.request.request_status
        : row.request.status;

    if (row.type === "publicVolunteer") {
      return row.selected && ["DONOR_FOUND", "COMPLETED"].includes(status);
    }

    if (row.type === "publicCreated") {
      return ["DONOR_FOUND", "COMPLETED"].includes(status);
    }

    return ["ACCEPTED", "COMPLETED"].includes(status);
  };

  const openChat = async (row) => {
    if (!row) return;

    const isDirect = row.type === "directReceived" || row.type === "directSent";

    const requestId = isDirect
      ? row.request.id
      : row.type === "publicVolunteer"
        ? row.request.blood_request
        : row.request.id;

    if (row.type === "publicVolunteer" && !row.selected) {
      setActionError(
        "You can open this chat only if you were selected for the request.",
      );
      return;
    }

    setActionLoading(`chat-${row.key}`);
    setActionError("");

    try {
      const conversation = await chatApiRequest(
        isDirect ? `direct/${requestId}/` : `public/${requestId}/`,
        "POST",
      );

      setActiveConversation(conversation);
      setMessages([]);
      setMessagesError("");
      setShowMobileDetail(true);

      await loadData();
    } catch (error) {
      console.error("Open chat error:", error);

      setActionError(error.message || "This chat is not available yet.");
    } finally {
      setActionLoading("");
    }
  };

  const selectRow = (row) => {
    setSelectedKey(row.key);
    setMessages([]);
    setMessagesError("");
    setActionError("");
    setActionSuccess("");
    setShowMobileDetail(true);

    if (row.conversation) {
      setActiveConversation(row.conversation);
    } else if (canOpenChat(row)) {
      setActiveConversation(null);
      openChat(row);
    } else {
      setActiveConversation(null);
    }
  };

  const runAction = async (key, endpoint, method = "POST", body = null) => {
    setActionLoading(key);
    setActionError("");
    setActionSuccess("");

    try {
      await apiRequest(endpoint, method, body);

      setActionSuccess("Your action was completed.");

      await loadData();
    } catch (error) {
      setActionError(error.message || "Unable to complete this action.");
    } finally {
      setActionLoading("");
    }
  };

  const respondToDirectRequest = (request, action) => {
    const actionName = action === "accept" ? "accept" : "decline";

    if (
      !window.confirm(
        `Are you sure you want to ${actionName} this blood request?`,
      )
    ) {
      return;
    }

    runAction(
      `respond-${request.id}`,
      `/blood-requests/direct/${request.id}/respond/`,
      "POST",
      { action },
    );
  };

  const withdrawDirectRequest = (request) => {
    if (!window.confirm("Are you sure you want to withdraw this request?")) {
      return;
    }

    runAction(
      `withdraw-${request.id}`,
      `/blood-requests/direct/${request.id}/withdraw/`,
    );
  };

  const cancelPublicRequest = (request) => {
    if (
      !window.confirm("Are you sure you want to cancel this public request?")
    ) {
      return;
    }

    runAction(`cancel-${request.id}`, `/blood-requests/${request.id}/cancel/`);
  };

  const selectVolunteer = (request, volunteer) => {
    if (
      !window.confirm(
        `Select ${
          volunteer.donor_name || "this donor"
        } for your blood request?`,
      )
    ) {
      return;
    }

    runAction(
      `select-${volunteer.id}`,
      `/blood-requests/${request.id}/select/${volunteer.id}/`,
    );
  };

  const loadMessages = useCallback(async () => {
    if (!activeConversation?.id) return;

    setMessagesLoading((current) => current || messages.length === 0);

    try {
      const data = await chatApiRequest(
        `conversations/${activeConversation.id}/messages/`,
      );

      setMessages(getListData(data));
      setMessagesError("");
    } catch (error) {
      setMessagesError(error.message || "Unable to load messages.");
    } finally {
      setMessagesLoading(false);
    }
  }, [activeConversation?.id, messages.length]);

  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([]);
      return;
    }

    loadMessages();

    const interval = setInterval(loadMessages, 5000);

    return () => clearInterval(interval);
  }, [activeConversation?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();

    const message = messageText.trim();

    if (!message || !activeConversation?.id || sending) {
      return;
    }

    setSending(true);
    setMessagesError("");

    try {
      await chatApiRequest(
        `conversations/${activeConversation.id}/messages/`,
        "POST",
        { message },
      );

      await loadMessages();

      setMessageText("");
      await loadData();
    } catch (error) {
      setMessagesError(error.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  const unassignConversation = async () => {
    if (!activeConversation?.id || actionLoading) return;

    const confirmed = window.confirm(
      "Unassign this donor/requester? This will close the chat for both participants. The conversation history will be kept.",
    );

    if (!confirmed) return;

    const conversationId = activeConversation.id;

    setActionLoading(`unassign-${conversationId}`);
    setActionError("");
    setActionSuccess("");

    try {
      await chatApiRequest(`conversations/${conversationId}/unassign/`, "POST");

      setActiveConversation(null);
      setMessages([]);
      setMessageText("");
      setActionSuccess("The assignment was cancelled and the chat was closed.");
      setShowMobileDetail(true);

      await loadData();
    } catch (error) {
      setActionError(error.message || "Unable to unassign this conversation.");
    } finally {
      setActionLoading("");
    }
  };

  const getRequestDetails = (row) => {
    if (row.type === "publicVolunteer") {
      const request = row.request;

      return {
        bloodGroup: request.request_blood_group_name,
        units: request.request_units_needed,
        hospital: request.request_hospital_name,
        address: request.request_hospital_address,
        urgency: request.request_urgency,
        requiredBy: request.request_required_by,
        createdAt: request.created_at,
        description: null,
      };
    }

    const request = row.request;

    return {
      bloodGroup: request.blood_group_name,
      units: request.units_needed ?? request.units,
      hospital: request.hospital_name ?? request.hospital,
      address: request.hospital_address ?? request.address,
      urgency: request.urgency,
      requiredBy: request.required_by,
      createdAt: request.created_at,
      description: request.details ?? request.description,
    };
  };

  const renderActions = (row) => {
    if (!row) return null;

    const request = row.request;

    const status =
      row.type === "publicVolunteer" ? request.request_status : request.status;

    if (row.type === "directReceived" && status === "PENDING") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => respondToDirectRequest(request, "accept")}
            disabled={Boolean(actionLoading)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === `respond-${request.id}`
              ? "Please wait..."
              : "Accept"}
          </button>

          <button
            onClick={() => respondToDirectRequest(request, "decline")}
            disabled={Boolean(actionLoading)}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      );
    }

    if (row.type === "directSent" && ["PENDING", "ACCEPTED"].includes(status)) {
      return (
        <button
          onClick={() => withdrawDirectRequest(request)}
          disabled={Boolean(actionLoading)}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Withdraw request
        </button>
      );
    }

    if (
      row.type === "publicCreated" &&
      ["OPEN", "DONOR_FOUND"].includes(status)
    ) {
      return (
        <button
          onClick={() => cancelPublicRequest(request)}
          disabled={Boolean(actionLoading)}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel public request
        </button>
      );
    }

    return null;
  };

  const renderVolunteerResponses = (request) => {
    const responses = volunteers[request.id] || [];

    if (!responses.length) {
      return (
        <p className="text-sm text-gray-500">
          No donors have volunteered for this request yet.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {responses.map((volunteer) => (
          <div
            key={volunteer.id}
            className="rounded-xl border border-gray-200 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-800">
                  {volunteer.donor_name || "Donor"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {volunteer.blood_group_name || "Blood group not specified"}
                  {volunteer.sub_district_name
                    ? ` · ${volunteer.sub_district_name}`
                    : ""}
                </p>
              </div>

              <StatusBadge status={volunteer.status} />
            </div>

            {request.status === "OPEN" && volunteer.status === "ACTIVE" && (
              <button
                onClick={() => selectVolunteer(request, volunteer)}
                disabled={Boolean(actionLoading)}
                className="mt-3 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                Select donor
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedRow) {
      return (
        <EmptyState
          title="Select a request"
          description="Choose a request from the list to see its details and available actions."
        />
      );
    }

    const details = getRequestDetails(selectedRow);

    const requestStatus =
      selectedRow.type === "publicVolunteer"
        ? selectedRow.request.request_status
        : selectedRow.request.status;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-red-600">
              {selectedRow.category}
            </p>

            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {selectedRow.title}
            </h2>
          </div>

          <StatusBadge status={requestStatus} />
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
          <Info label="Blood group" value={details.bloodGroup} />
          <Info label="Units needed" value={details.units} />
          <Info label="Hospital" value={details.hospital} />
          <Info label="Hospital address" value={details.address} />
          <Info label="Urgency" value={details.urgency} />
          <Info label="Required by" value={formatDate(details.requiredBy)} />
          <Info label="Request created" value={formatDate(details.createdAt)} />
        </div>

        {details.description && (
          <div>
            <h3 className="mb-1 font-semibold text-gray-800">
              Additional details
            </h3>

            <p className="whitespace-pre-wrap text-sm text-gray-600">
              {details.description}
            </p>
          </div>
        )}

        {selectedRow.type === "publicCreated" && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900">
              Donor responses
            </h3>

            {renderVolunteerResponses(selectedRow.request)}
          </section>
        )}

        {selectedRow.type === "publicVolunteer" && (
          <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            {selectedRow.selected
              ? "You were selected for this public request. You can open the requester chat below."
              : "You volunteered for this public request. The requester has not selected you for the chat yet."}
          </div>
        )}

        {actionError && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {actionSuccess && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {actionSuccess}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          {renderActions(selectedRow)}

          {canOpenChat(selectedRow) && (
            <button
              onClick={() => openChat(selectedRow)}
              disabled={Boolean(actionLoading)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === `chat-${selectedRow.key}`
                ? "Opening chat..."
                : activeConversation
                  ? "Open chat"
                  : "Message"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderChatPanel = () => (
    <div className="flex h-full min-h-[500px] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <p className="font-semibold text-gray-900">
            {activeConversation?.other_participant_name || "Conversation"}
          </p>

          <p className="text-xs text-gray-500">Blood request conversation</p>
        </div>

        <button
          onClick={unassignConversation}
          disabled={Boolean(actionLoading)}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionLoading === `unassign-${activeConversation?.id}`
            ? "Unassigning..."
            : "Unassign"}
        </button>
      </div>

      {(actionError || actionSuccess) && (
        <p
          className={`border-b px-4 py-2 text-sm ${
            actionError
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-green-100 bg-green-50 text-green-700"
          }`}
        >
          {actionError || actionSuccess}
        </p>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
        {messagesLoading && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">
            Loading messages...
          </p>
        )}

        {!messagesLoading && messages.length === 0 && !messagesError && (
          <p className="py-6 text-center text-sm text-gray-500">
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((item) => (
          <div
            key={item.id}
            className={`flex ${item.is_mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                item.is_mine
                  ? "rounded-br-sm bg-red-600 text-white"
                  : "rounded-bl-sm border border-gray-200 bg-white text-gray-800"
              }`}
            >
              {!item.is_mine && (
                <p className="mb-1 text-xs font-semibold opacity-70">
                  {item.sender_name || "Participant"}
                </p>
              )}

              <p className="whitespace-pre-wrap break-words text-sm">
                {item.message}
              </p>

              <p
                className={`mt-1 text-right text-[10px] ${
                  item.is_mine ? "text-red-100" : "text-gray-400"
                }`}
              >
                {formatDate(item.created_at)}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {messagesError && (
        <p className="border-t border-gray-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {messagesError}
        </p>
      )}

      <form
        onSubmit={sendMessage}
        className="flex gap-2 border-t border-gray-200 p-3"
      >
        <input
          type="text"
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          placeholder="Type a message..."
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
        />

        <button
          type="submit"
          disabled={!messageText.trim() || sending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage blood requests and conversations in one place.
            </p>
          </div>

          <button
            onClick={() => navigate("/home")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Home
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex gap-2 rounded-xl bg-white p-2 shadow-sm">
          <button
            onClick={() => {
              setActiveTab("donor");
              setSelectedKey("");
              setActiveConversation(null);
              setShowMobileDetail(false);
              setActionError("");
              setActionSuccess("");
            }}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "donor"
                ? "bg-red-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Donor Messages
          </button>

          <button
            onClick={() => {
              setActiveTab("requester");
              setSelectedKey("");
              setActiveConversation(null);
              setShowMobileDetail(false);
              setActionError("");
              setActionSuccess("");
            }}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "requester"
                ? "bg-red-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Requester Messages
          </button>
        </div>

        {pageError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
            Loading your inbox...
          </div>
        ) : (
          <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:grid-cols-[340px_minmax(0,1fr)]">
            <aside
              className={`border-b border-gray-200 md:border-b-0 md:border-r ${
                showMobileDetail ? "hidden md:block" : "block"
              }`}
            >
              <div className="border-b border-gray-200 px-4 py-4">
                <h2 className="font-semibold text-gray-900">
                  {activeTab === "donor"
                    ? "Requests received & volunteered"
                    : "Requests you've sent"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {rows.length} item
                  {rows.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="max-h-[720px] overflow-y-auto">
                {rows.length === 0 ? (
                  <EmptyState
                    title="Nothing here yet"
                    description={
                      activeTab === "donor"
                        ? "Direct requests and public requests you volunteer for will appear here."
                        : "Your sent direct requests and created public requests will appear here."
                    }
                  />
                ) : (
                  rows.map((row) => (
                    <button
                      key={row.key}
                      onClick={() => selectRow(row)}
                      className={`block w-full border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 ${
                        selectedKey === row.key
                          ? "bg-red-50 border-l-4 border-l-red-600"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-gray-900">
                          {row.title}
                        </p>

                        <StatusBadge status={row.status} />
                      </div>

                      <p className="mt-1 text-xs font-medium text-red-600">
                        {row.category}
                      </p>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {row.subtitle}
                      </p>

                      {row.conversation && (
                        <p className="mt-2 text-xs font-semibold text-green-700">
                          Chat available
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section
              className={`min-w-0 ${
                showMobileDetail ? "block" : "hidden md:block"
              }`}
            >
              <div className="border-b border-gray-200 px-4 py-3 md:hidden">
                <button
                  onClick={() => setShowMobileDetail(false)}
                  className="text-sm font-semibold text-red-600"
                >
                  ← Back to list
                </button>
              </div>

              <div className="h-full p-4 sm:p-6">
                {activeConversation ? renderChatPanel() : renderDetailPanel()}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default Inbox;
