import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  LoadErrorState,
  LoadingState,
  PATHS,
  apiRequest,
  ageFrom,
  capitalise,
  formatDate,
  label,
  useProfileLoader,
} from "../components/donor/donorShared";

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function DropIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.5c-.4 0-.8.2-1 .5C8.2 6.7 5 10.4 5 14.2A7 7 0 0 0 12 21a7 7 0 0 0 7-6.8c0-3.8-3.2-7.5-6-11.2-.2-.3-.6-.5-1-.5Z" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

// Stays fixed at the top of the screen while the page scrolls.
function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to={PATHS.home} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
            <DropIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">BloodLink</span>
        </Link>

        <Link
          to={PATHS.home}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-red-50 hover:text-red-700"
        >
          <ArrowLeftIcon />
          Back to home
        </Link>
      </div>
    </header>
  );
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <TopBar />
      {children}
    </div>
  );
}

// A plain label + value pair, no borders or boxes.
function Item({ title, children }) {
  return (
    <div>
      <dt className="text-sm text-neutral-500">{title}</dt>
      <dd className="text-base font-semibold text-neutral-900">
        {children || "Not provided"}
      </dd>
    </div>
  );
}

function initialsOf(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MyDonorProfile() {
  const navigate = useNavigate();
  const { status, profile, error, reload } = useProfileLoader();

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your donor profile? This action cannot be undone.",
    );

    if (!confirmed) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const { response, data } = await apiRequest("DELETE");

      if (response.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(data?.detail || "Could not delete your donor profile.");
      }

      navigate(PATHS.home, { replace: true });
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (status === "loading") {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (status === "none") {
    return (
      <PageShell>
        <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
            {/* Red header */}
            <div className="flex flex-col items-center bg-red-600 px-8 py-10 text-center text-white">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-red-600">
                <DropIcon className="h-10 w-10" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                You are not a donor yet
              </h1>
              <p className="mt-2 max-w-md text-base text-red-100">
                Create your donor profile so people who need your blood group
                can find you.
              </p>
            </div>

            {/* Body */}
            <div className="p-8 text-center">
              <p className="text-base font-medium text-neutral-800">
                To become a donor you need to be
              </p>
              <ul className="mt-3 flex flex-wrap justify-center gap-3 text-sm font-semibold text-red-700">
                <li className="rounded-full bg-red-50 px-4 py-2">
                  18 to 65 years old
                </li>
                <li className="rounded-full bg-red-50 px-4 py-2">
                  At least 45 kg
                </li>
                <li className="rounded-full bg-red-50 px-4 py-2">
                  In good health
                </li>
              </ul>

              <button
                onClick={() => navigate(PATHS.create)}
                className="mt-7 rounded-full bg-red-600 px-10 py-3 text-base font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
              >
                Create donor profile
              </button>
            </div>
          </section>
        </main>
      </PageShell>
    );
  }

  if (status === "expired" || status === "error") {
    return (
      <PageShell>
        <LoadErrorState status={status} error={error} onRetry={reload} />
      </PageShell>
    );
  }

  const age = ageFrom(profile.date_of_birth);
  const available = profile.availability === "AVAILABLE";
  const bloodGroup = label(profile.blood_group_name || "") || "—";

  return (
    <PageShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {/* One single card */}
        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
          {/* Header */}
          <div className="flex items-center gap-5 bg-red-600 p-6 text-white sm:p-8">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-bold text-red-600">
              {initialsOf(profile.full_name)}
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {profile.full_name}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-base text-red-100">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    available ? "bg-green-400" : "bg-neutral-300"
                  }`}
                />
                {available ? "Available to donate" : "Currently unavailable"}
              </p>
            </div>

            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-red-600">
              {bloodGroup}
            </span>
          </div>

          {/* All details in one grid */}
          <div className="p-6 sm:p-8">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              <Item title="Mobile number">{profile.phone_number}</Item>
              <Item title="Date of birth">
                {formatDate(profile.date_of_birth)}
              </Item>
              <Item title="Age">{age !== null ? `${age} years` : ""}</Item>

              <Item title="Gender">{capitalise(profile.gender)}</Item>
              <Item title="Blood group">
                {profile.blood_group_name || profile.blood_group}
              </Item>
              <Item title="Weight">
                {profile.weight_kg ? `${profile.weight_kg} kg` : ""}
              </Item>

              <Item title="State">{profile.state_name}</Item>
              <Item title="District">{profile.district_name}</Item>
              <Item title="Sub-district">
                {profile.sub_district_name || profile.sub_district}
              </Item>

              <Item title="Last donation">
                {profile.last_donation_date
                  ? formatDate(profile.last_donation_date)
                  : "Not donated yet"}
              </Item>
            </dl>

            {deleteError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
              >
                {deleteError}
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:justify-end">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full border border-neutral-300 px-7 py-3 text-base font-semibold text-neutral-700 transition hover:border-red-600 hover:text-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete profile"}
              </button>
              <button
                onClick={() => navigate(PATHS.edit)}
                className="rounded-full bg-red-600 px-9 py-3 text-base font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
              >
                Edit profile
              </button>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
