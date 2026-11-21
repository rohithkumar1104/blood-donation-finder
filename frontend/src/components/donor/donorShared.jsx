import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export const API_URL =
  "https://blood-donation-finder-awce.onrender.com/api/donors/profile/";
export const TOKEN_KEY = "authToken";

export const PATHS = {
  login: "/login",
  home: "/home",
  create: "/become-donor",
  profile: "/donor-profile",
  edit: "/donor-profile/edit",
  chats: "/chats",
};

export async function apiRequest(method, body) {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(API_URL, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    // DELETE may return an empty response.
  }

  return { response, data };
}

export function useProfileLoader() {
  const navigate = useNavigate();

  const [state, setState] = useState({
    status: "loading",
    profile: null,
    error: "",
  });

  const load = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      navigate(PATHS.login, { replace: true });
      return;
    }

    setState({ status: "loading", profile: null, error: "" });

    try {
      const { response, data } = await apiRequest("GET");

      if (response.status === 401) {
        setState({ status: "expired", profile: null, error: "" });
      } else if (response.status === 404) {
        setState({ status: "none", profile: null, error: "" });
      } else if (response.ok && data.full_name) {
        setState({ status: "ready", profile: data, error: "" });
      } else {
        setState({
          status: "error",
          profile: null,
          error: data.detail || "Could not load your donor profile.",
        });
      }
    } catch {
      setState({
        status: "error",
        profile: null,
        error: "Could not connect to the backend server.",
      });
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

export function formatDate(value) {
  if (!value) return "";

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ageFrom(value) {
  if (!value) return null;

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const today = new Date();

  let age = today.getFullYear() - year;

  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age--;
  }

  return age;
}

export const label = (group) => (group || "").replace("-", "\u2212");

export const capitalise = (value) =>
  value ? value[0].toUpperCase() + value.slice(1) : "";

export function PageHeader() {
  const isLoggedIn = Boolean(localStorage.getItem(TOKEN_KEY));

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to={PATHS.home} className="text-lg font-bold">
          BloodLink
        </Link>

        <nav className="flex items-center gap-4">
          {isLoggedIn && (
            <Link
              to={PATHS.chats}
              className="text-sm font-medium text-gray-700 hover:text-red-600"
            >
              Chats
            </Link>
          )}

          <Link
            to={PATHS.home}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Back to home
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function LoadingState() {
  return (
    <main className="p-10 text-center">Loading your donor profile...</main>
  );
}

export function LoadErrorState({ status, error, onRetry }) {
  const expired = status === "expired";

  return (
    <main className="mx-auto max-w-lg p-10 text-center">
      <h1 className="text-xl font-bold">
        {expired ? "Please log in again" : "Something went wrong"}
      </h1>

      <p className="my-3 text-gray-600">
        {expired ? "Your session has expired." : error}
      </p>

      {expired ? (
        <Link to={PATHS.login} className="text-red-600 underline">
          Go to login
        </Link>
      ) : (
        <button
          onClick={onRetry}
          className="rounded bg-red-600 px-5 py-2 text-white"
        >
          Try again
        </button>
      )}
    </main>
  );
}
