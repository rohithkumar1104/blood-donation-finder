import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PATHS,
  apiRequest,
  useProfileLoader,
} from "../components/donor/donorShared";

const API_BASE = "https://blood-donation-finder-awce.onrender.com/api";
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

async function fetchList(endpoint) {
  const token = localStorage.getItem("authToken");

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Could not load ${endpoint}`);
  }

  return response.json();
}

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
          to={PATHS.profile}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-red-50 hover:text-red-700"
        >
          <ArrowLeftIcon />
          Back to profile
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

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60";

function Field({ id, label, optional, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-base font-medium text-neutral-800"
      >
        {label}
        {optional && (
          <span className="font-normal text-neutral-500"> (optional)</span>
        )}
      </label>
      {children}
    </div>
  );
}

// Selectable pills built on real radio inputs.
function RadioPills({ name, legend, options, value, onChange, columns }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-base font-medium text-neutral-800">
        {legend}
      </legend>
      <div className={`grid gap-2 ${columns}`}>
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              className="peer sr-only"
            />
            <span className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base font-semibold text-neutral-700 transition hover:border-red-400 peer-checked:border-red-600 peer-checked:bg-red-600 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-red-200">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Heading({ children }) {
  return (
    <h2 className="border-t border-neutral-200 pt-6 text-lg font-semibold text-neutral-900 first:border-t-0 first:pt-0 sm:col-span-2">
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function EditDonorProfile() {
  const navigate = useNavigate();
  const profileState = useProfileLoader();

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);

  const [form, setForm] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (profileState.status !== "ready") return;

    let cancelled = false;

    async function loadFormData() {
      try {
        setLoadingOptions(true);

        const [stateData, bloodGroupData] = await Promise.all([
          fetchList("/locations/states/"),
          fetchList("/blood-groups/"),
        ]);

        const districtData = await fetchList(
          `/locations/districts/?state=${profileState.profile.state_id}`,
        );

        const subDistrictData = await fetchList(
          `/locations/sub-districts/?district=${profileState.profile.district_id}`,
        );

        if (cancelled) return;

        setStates(stateData);
        setBloodGroups(bloodGroupData);
        setDistricts(districtData);
        setSubDistricts(subDistrictData);

        setForm({
          full_name: profileState.profile.full_name || "",
          phone_number: profileState.profile.phone_number || "",
          date_of_birth: profileState.profile.date_of_birth || "",
          gender: (profileState.profile.gender || "").toLowerCase(),
          blood_group: String(profileState.profile.blood_group || ""),
          weight_kg: profileState.profile.weight_kg || "",
          state: String(profileState.profile.state_id || ""),
          district: String(profileState.profile.district_id || ""),
          sub_district: String(profileState.profile.sub_district || ""),
          last_donation_date: profileState.profile.last_donation_date || "",
          availability: profileState.profile.availability || "AVAILABLE",
        });
      } catch (err) {
        if (!cancelled) {
          setError("Could not load the form details. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    loadFormData();

    return () => {
      cancelled = true;
    };
  }, [profileState.status, profileState.profile]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function toggleAvailability(event) {
    const checked = event.target.checked;
    setForm((previous) => ({
      ...previous,
      availability: checked ? "AVAILABLE" : "UNAVAILABLE",
    }));
  }

  async function handleStateChange(event) {
    const stateId = event.target.value;

    setForm((previous) => ({
      ...previous,
      state: stateId,
      district: "",
      sub_district: "",
    }));

    setDistricts([]);
    setSubDistricts([]);

    if (!stateId) return;

    try {
      const data = await fetchList(`/locations/districts/?state=${stateId}`);
      setDistricts(data);
    } catch {
      setError("Could not load districts.");
    }
  }

  async function handleDistrictChange(event) {
    const districtId = event.target.value;

    setForm((previous) => ({
      ...previous,
      district: districtId,
      sub_district: "",
    }));

    setSubDistricts([]);

    if (!districtId) return;

    try {
      const data = await fetchList(
        `/locations/sub-districts/?district=${districtId}`,
      );
      setSubDistricts(data);
    } catch {
      setError("Could not load sub-districts.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form) return;

    const payload = {
      full_name: form.full_name.trim(),
      phone_number: form.phone_number.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender.toLowerCase(),
      blood_group: Number(form.blood_group),
      weight_kg: Number(form.weight_kg),
      sub_district: Number(form.sub_district),
      last_donation_date: form.last_donation_date || null,
      availability: form.availability,
    };

    try {
      setSaving(true);

      const { response, data } = await apiRequest("PATCH", payload);

      if (response.ok) {
        setSuccess("Your donor profile has been updated.");
        setTimeout(() => navigate(PATHS.profile), 1000);
      } else {
        const messages = Object.entries(data)
          .map(([field, value]) => {
            const message = Array.isArray(value)
              ? value.join(" ")
              : String(value);
            return `${field}: ${message}`;
          })
          .join("\n");

        setError(messages || "Could not update your profile.");
      }
    } catch {
      setError("Could not connect to the backend server.");
    } finally {
      setSaving(false);
    }
  }

  if (profileState.status === "loading" || loadingOptions || !form) {
    return (
      <PageShell>
        <div className="p-8 text-center text-neutral-600">
          Loading your donor profile...
        </div>
      </PageShell>
    );
  }

  if (profileState.status !== "ready") {
    return (
      <PageShell>
        <main className="mx-auto max-w-md px-4 py-12">
          <div className="flex flex-col items-center rounded-3xl border border-neutral-200 bg-white p-8 text-center">
            <p className="text-neutral-700">
              {profileState.status === "none"
                ? "You do not have a donor profile yet."
                : profileState.error || "Unable to load your profile."}
            </p>
            <button
              onClick={() => navigate(PATHS.profile)}
              className="mt-5 rounded-full bg-red-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            >
              Back to profile
            </button>
          </div>
        </main>
      </PageShell>
    );
  }

  const available = form.availability === "AVAILABLE";

  return (
    <PageShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
          {/* Header */}
          <div className="bg-red-600 p-6 text-white sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Edit donor profile
            </h1>
            <p className="mt-1 text-base text-red-100">
              Update your details below and save your changes.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8"
          >
            {error && (
              <div
                role="alert"
                className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700 sm:col-span-2"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-base text-green-700 sm:col-span-2"
              >
                {success}
              </div>
            )}

            <Heading>Personal details</Heading>

            <div className="sm:col-span-2">
              <Field id="full_name" label="Full name">
                <input
                  id="full_name"
                  className={inputClass}
                  name="full_name"
                  value={form.full_name}
                  onChange={updateField}
                  required
                />
              </Field>
            </div>

            <Field id="phone_number" label="Phone number">
              <input
                id="phone_number"
                className={inputClass}
                name="phone_number"
                type="tel"
                inputMode="numeric"
                value={form.phone_number}
                onChange={updateField}
                maxLength={10}
                required
              />
            </Field>

            <Field id="date_of_birth" label="Date of birth">
              <input
                id="date_of_birth"
                className={inputClass}
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={updateField}
                required
              />
            </Field>

            <div className="sm:col-span-2">
              <RadioPills
                name="gender"
                legend="Gender"
                columns="grid-cols-3"
                options={GENDERS}
                value={form.gender}
                onChange={updateField}
              />
            </div>

            <Heading>Blood details</Heading>

            <div className="sm:col-span-2">
              <RadioPills
                name="blood_group"
                legend="Blood group"
                columns="grid-cols-4"
                options={bloodGroups.map((group) => ({
                  value: String(group.id),
                  label: String(group.name).replace("-", "\u2212"),
                }))}
                value={form.blood_group}
                onChange={updateField}
              />
            </div>

            <Field id="weight_kg" label="Weight (kg)">
              <input
                id="weight_kg"
                className={inputClass}
                type="number"
                name="weight_kg"
                min="45"
                value={form.weight_kg}
                onChange={updateField}
                required
              />
            </Field>

            <Field id="last_donation_date" label="Last donation date" optional>
              <input
                id="last_donation_date"
                className={inputClass}
                type="date"
                name="last_donation_date"
                value={form.last_donation_date}
                onChange={updateField}
              />
            </Field>

            <Heading>Location</Heading>

            <Field id="state" label="State">
              <select
                id="state"
                className={inputClass}
                value={form.state}
                onChange={handleStateChange}
                required
              >
                <option value="">Select state</option>
                {states.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="district" label="District">
              <select
                id="district"
                className={inputClass}
                value={form.district}
                onChange={handleDistrictChange}
                required
              >
                <option value="">Select district</option>
                {districts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <Field id="sub_district" label="Sub-district / Taluk">
                <select
                  id="sub_district"
                  className={inputClass}
                  name="sub_district"
                  value={form.sub_district}
                  onChange={updateField}
                  required
                >
                  <option value="">Select sub-district</option>
                  {subDistricts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Heading>Availability</Heading>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:col-span-2">
              <span>
                <span className="block text-base font-semibold text-neutral-900">
                  {available ? "Available to donate" : "Currently unavailable"}
                </span>
                <span className="block text-sm text-neutral-500">
                  Switch this off if you cannot donate right now.
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={available}
                onChange={toggleAvailability}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative h-7 w-12 shrink-0 rounded-full bg-neutral-300 transition peer-checked:bg-red-600 peer-focus-visible:ring-4 peer-focus-visible:ring-red-200 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
              />
            </label>

            <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 pt-6 sm:col-span-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate(PATHS.profile)}
                className="rounded-full border border-neutral-300 px-7 py-3 text-base font-semibold text-neutral-700 transition hover:border-red-600 hover:text-red-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-red-600 px-9 py-3 text-base font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </PageShell>
  );
}
