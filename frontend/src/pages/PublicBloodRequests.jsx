import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000/api";
const TOKEN_KEY = "authToken";

const REQUESTS_URL = `${API_BASE}/blood-requests/`;
const BLOOD_GROUPS_URL = `${API_BASE}/blood-groups/`;

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
  if (urgency === "CRITICAL") {
    return "bg-red-100 text-red-800";
  }

  if (urgency === "URGENT") {
    return "bg-orange-100 text-orange-800";
  }

  return "bg-green-100 text-green-800";
}

function RequestCard({ request, onVolunteer, volunteering }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
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

      <div className="mt-5 space-y-3 text-sm">
        <div>
          <p className="font-semibold text-neutral-800">Hospital</p>
          <p className="mt-0.5 text-neutral-600">{request.hospital_name}</p>
          {request.hospital_address && (
            <p className="mt-0.5 text-neutral-500">
              {request.hospital_address}
            </p>
          )}
        </div>

        {request.sub_district_name && (
          <div>
            <p className="font-semibold text-neutral-800">Location</p>
            <p className="mt-0.5 text-neutral-600">
              {request.sub_district_name}
            </p>
          </div>
        )}

        <div>
          <p className="font-semibold text-neutral-800">Required by</p>
          <p className="mt-0.5 text-neutral-600">
            {formatDate(request.required_by)}
          </p>
        </div>

        {request.description && (
          <div>
            <p className="font-semibold text-neutral-800">Additional details</p>
            <p className="mt-0.5 whitespace-pre-wrap text-neutral-600">
              {request.description}
            </p>
          </div>
        )}

        <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          Posted by {request.requester_name || "BloodLink user"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onVolunteer(request.id)}
        disabled={volunteering}
        className="mt-5 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {volunteering ? "Submitting..." : "Volunteer to donate"}
      </button>
    </article>
  );
}

export default function PublicBloodRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [volunteeringId, setVolunteeringId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [requestResponse, bloodResponse] = await Promise.all([
        fetch(REQUESTS_URL, {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch(BLOOD_GROUPS_URL),
      ]);

      if (requestResponse.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        navigate("/login", { replace: true });
        return;
      }

      if (!requestResponse.ok || !bloodResponse.ok) {
        throw new Error("Could not load public blood requests.");
      }

      const [requestData, bloodData] = await Promise.all([
        requestResponse.json(),
        bloodResponse.json(),
      ]);

      setRequests(getResults(requestData));
      setBloodGroups(getResults(bloodData));
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleVolunteer(requestId) {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setVolunteeringId(requestId);
    setError("");
    setMessage("");

    try {
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
        // The response may not contain JSON.
      }

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Could not volunteer for this request.");
      }

      setMessage(data.detail || "You have successfully volunteered.");
    } catch (err) {
      setError(err.message || "Could not submit your volunteer response.");
    } finally {
      setVolunteeringId(null);
    }
  }

  const filteredRequests = selectedBloodGroup
    ? requests.filter(
        (request) => String(request.blood_group) === String(selectedBloodGroup),
      )
    : requests;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/home" className="text-lg font-bold tracking-tight">
            BloodLink
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              to="/chats"
              className="text-sm font-medium text-neutral-700 hover:text-red-600"
            >
              Chats
            </Link>
            <Link
              to="/home"
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Back to home
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mb-8">
          <span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
            BloodLink community
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Public blood requests
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            Browse open blood requests and volunteer to help someone in need.
            You must have an available donor profile with a matching blood group
            to volunteer.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        <section className="mb-7 flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label
              htmlFor="blood-group-filter"
              className="mb-2 block text-sm font-semibold"
            >
              Filter by blood group
            </label>

            <select
              id="blood-group-filter"
              value={selectedBloodGroup}
              onChange={(event) => setSelectedBloodGroup(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100"
            >
              <option value="">All blood groups</option>
              {bloodGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-neutral-600">
              {filteredRequests.length} open request(s)
            </p>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:border-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Refresh
            </button>

            <Link
              to="/request-blood"
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Create request
            </Link>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white py-16 text-center text-sm text-neutral-600">
            Loading public requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-16 text-center">
            <h2 className="text-lg font-semibold">No open requests found</h2>
            <p className="mt-2 text-sm text-neutral-500">
              {selectedBloodGroup
                ? "Try selecting another blood group or view all requests."
                : "There are currently no open public blood requests."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onVolunteer={handleVolunteer}
                volunteering={volunteeringId === request.id}
              />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-neutral-500">
          Donor eligibility and blood-group matching are checked by the server.
          Contact details are not displayed on public request cards.
        </p>
      </main>
    </div>
  );
}
