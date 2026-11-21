import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000/api";
const REQUESTS_URL = `${API_BASE}/blood-requests/`;
const PROFILE_URL = `${API_BASE}/donors/profile/`;
const CURRENT_USER_URL = `${API_BASE}/auth/me/`;
const TOKEN_KEY = "authToken";

function getResults(data) {
  return Array.isArray(data) ? data : data.results || [];
}

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function urgencyStyle(urgency) {
  if (urgency === "CRITICAL") return "bg-red-100 text-red-800";
  if (urgency === "URGENT") return "bg-orange-100 text-orange-800";
  return "bg-green-100 text-green-800";
}

function RequestCard({
  request,
  onVolunteer,
  volunteering,
  duplicate = false,
  isOwner = false,
}) {
  return (
    <article className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-[320px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-red-700">
            {request.blood_group_name || "Blood group"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {request.units_needed} unit(s) needed
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${urgencyStyle(
            request.urgency,
          )}`}
        >
          {request.urgency || "NORMAL"}
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-2 text-sm">
        <p>
          <strong>Hospital:</strong> {request.hospital_name}
        </p>

        {request.hospital_address && (
          <p className="text-neutral-600">{request.hospital_address}</p>
        )}

        {request.sub_district_name && (
          <p>
            <strong>Location:</strong> {request.sub_district_name}
          </p>
        )}

        <p>
          <strong>Required by:</strong> {formatDate(request.required_by)}
        </p>

        {request.description && (
          <p className="whitespace-pre-wrap text-neutral-600">
            {request.description}
          </p>
        )}

        <p className="border-t border-neutral-100 pt-2 text-xs text-neutral-500">
          Posted by {request.requester_name || "BloodLink user"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!duplicate && !isOwner) {
            onVolunteer(request.id);
          }
        }}
        disabled={duplicate || isOwner || volunteering}
        className="mt-4 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isOwner
          ? "Your own request"
          : volunteering
            ? "Please wait..."
            : "Volunteer to donate"}
      </button>
    </article>
  );
}

export default function HomePublicRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [volunteeringId, setVolunteeringId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch(REQUESTS_URL);

      if (!response.ok) {
        throw new Error("Could not load public blood requests.");
      }

      const data = await response.json();
      setRequests(getResults(data));
      setError("");
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load public requests and refresh every 30 seconds.
  useEffect(() => {
    loadRequests();

    const interval = setInterval(loadRequests, 30000);

    return () => clearInterval(interval);
  }, [loadRequests]);

  // Identify the currently logged-in user.
  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setCurrentUserId(null);
        return;
      }

      try {
        const response = await fetch(CURRENT_USER_URL, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        if (response.status === 401) {
          if (isMounted) setCurrentUserId(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Could not identify current user.");
        }

        const data = await response.json();

        if (isMounted) {
          setCurrentUserId(data.id);
        }
      } catch (err) {
        console.error("Could not identify current user:", err);

        if (isMounted) {
          setCurrentUserId(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleVolunteer(requestId) {
    setError("");
    setMessage("");

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      navigate("/login");
      return;
    }

    setVolunteeringId(requestId);

    try {
      const profileResponse = await fetch(PROFILE_URL, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (profileResponse.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setCurrentUserId(null);
        navigate("/login", { replace: true });
        return;
      }

      if (profileResponse.status === 404) {
        navigate("/become-donor");
        return;
      }

      if (!profileResponse.ok) {
        throw new Error("Could not verify your donor profile.");
      }

      const response = await fetch(`${REQUESTS_URL}${requestId}/volunteer/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Response may not contain JSON.
      }

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setCurrentUserId(null);
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Could not volunteer for this request.");
      }

      setMessage(data.detail || "You have successfully volunteered.");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setVolunteeringId(null);
    }
  }

  function isRequestOwner(request) {
    return (
      currentUserId !== null &&
      String(request.requester_id) === String(currentUserId)
    );
  }

  return (
    <section className="bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 text-center">
          <span className="rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-700">
            BloodLink community
          </span>

          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Emergency Blood Requests
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            People in need of blood are waiting for helping hands. Browse
            requests and become someone's lifesaver.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700"
          >
            {message}
          </p>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-neutral-500">
            Loading public blood requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center">
            <h3 className="text-lg font-semibold">
              No open blood requests right now
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              New requests will appear here automatically.
            </p>
          </div>
        ) : (
          <div
            className="home-request-viewport relative overflow-hidden py-3"
            aria-label="Public blood requests scrolling horizontally"
          >
            <div
              className={`home-request-track flex w-max ${
                requests.length > 1 ? "is-animated" : ""
              }`}
            >
              <div className="home-request-group flex shrink-0 gap-5">
                {requests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onVolunteer={handleVolunteer}
                    volunteering={volunteeringId === request.id}
                    isOwner={isRequestOwner(request)}
                  />
                ))}
              </div>

              {requests.length > 1 && (
                <div
                  className="home-request-group flex shrink-0 gap-5"
                  aria-hidden="true"
                >
                  {requests.map((request) => (
                    <RequestCard
                      key={`duplicate-${request.id}`}
                      request={request}
                      onVolunteer={handleVolunteer}
                      volunteering={volunteeringId === request.id}
                      duplicate
                      isOwner={isRequestOwner(request)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-neutral-500">
          Viewing requests is open to everyone. Volunteering requires login and
          a donor profile.
        </p>
      </div>

      <style>{`
        .home-request-viewport {
          overflow-x: hidden;
        }

        .home-request-track.is-animated {
          animation: home-request-scroll 35s linear infinite;
          will-change: transform;
        }

        .home-request-group {
          padding-right: 1.25rem;
        }

        .home-request-viewport:hover .home-request-track,
        .home-request-viewport:focus-within .home-request-track {
          animation-play-state: paused;
        }

        @keyframes home-request-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-request-track.is-animated {
            animation: none;
          }

          .home-request-viewport {
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}
