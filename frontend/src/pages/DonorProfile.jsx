import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PATHS, useProfileLoader } from "../components/donor/donorShared";

/* ------------------------------------------------------------------ */
/* Settings: change these to match your Django API                     */
/* ------------------------------------------------------------------ */

// Endpoint that creates a donor profile for the logged-in user.
const API_URL =
  "https://blood-donation-finder-awce.onrender.com/api/donors/profile/";

// Login stores the token under this key. DRF token auth expects
// "Authorization: Token <token>". Use "Bearer" here if you use JWT.
const TOKEN_KEY = "authToken";
const AUTH_SCHEME = "Token";

const BLOOD_GROUPS_API =
  "https://blood-donation-finder-awce.onrender.com/api/blood-groups/";
const STATES_API =
  "https://blood-donation-finder-awce.onrender.com/api/locations/states/";
const DISTRICTS_API =
  "https://blood-donation-finder-awce.onrender.com/api/locations/districts/";
const SUB_DISTRICTS_API =
  "https://blood-donation-finder-awce.onrender.com/api/locations/sub-districts/";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const MIN_AGE = 18;
const MAX_AGE = 65;
const MIN_WEIGHT = 45;

const EMPTY_FORM = {
  full_name: "",
  phone_number: "",
  date_of_birth: "",
  gender: "",
  blood_group: "",
  weight_kg: "",
  state: "",
  district: "",
  sub_district: "",
  last_donation_date: "",
  is_available: true,
  consent: false,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, "0");

function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function yearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

function ageFrom(dateString) {
  const born = new Date(dateString);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}

function daysSince(dateString) {
  const then = new Date(dateString);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / 86400000);
}

const label = (group) => group.replace("-", "\u2212");

function validate(form) {
  const errors = {};

  if (form.full_name.trim().length < 3) {
    errors.full_name = "Enter your full name.";
  }

  const digits = form.phone_number.replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(digits)) {
    errors.phone_number = "Enter a valid 10-digit mobile number.";
  }

  if (!form.date_of_birth) {
    errors.date_of_birth = "Select your date of birth.";
  } else {
    const age = ageFrom(form.date_of_birth);
    if (age === null) {
      errors.date_of_birth = "Enter a valid date.";
    } else if (age < MIN_AGE || age > MAX_AGE) {
      errors.date_of_birth = `Donors must be between ${MIN_AGE} and ${MAX_AGE} years old.`;
    }
  }

  if (!form.gender) errors.gender = "Select your gender.";
  if (!form.blood_group) errors.blood_group = "Select your blood group.";

  const weight = Number(form.weight_kg);
  if (!form.weight_kg) {
    errors.weight_kg = "Enter your weight.";
  } else if (Number.isNaN(weight) || weight < MIN_WEIGHT) {
    errors.weight_kg = `Donors must weigh at least ${MIN_WEIGHT} kg.`;
  } else if (weight > 250) {
    errors.weight_kg = "Enter a valid weight.";
  }

  if (!form.state) errors.state = "Select your state.";
  if (!form.district) errors.district = "Select your district.";
  if (!form.sub_district) errors.sub_district = "Select your sub-district.";

  if (form.last_donation_date && daysSince(form.last_donation_date) < 0) {
    errors.last_donation_date = "The date cannot be in the future.";
  }

  if (!form.consent) {
    errors.consent = "Please confirm to continue.";
  }

  return errors;
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

function CheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
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

const inputClass = (error) =>
  `w-full rounded-xl border bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-4 ${
    error
      ? "border-red-500 focus:border-red-600 focus:ring-red-100"
      : "border-neutral-200 focus:border-red-600 focus:ring-red-100"
  }`;

function FieldError({ id, error }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
      {error}
    </p>
  );
}

function Field({ id, label: text, required, hint, error, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-neutral-800"
      >
        {text}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>
      )}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function TextInput({ id, label: text, required, hint, error, ...props }) {
  return (
    <Field id={id} label={text} required={required} hint={hint} error={error}>
      <input
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass(error)}
        {...props}
      />
    </Field>
  );
}

function SelectInput({
  id,
  label: text,
  required,
  error,
  placeholder,
  options,
  ...props
}) {
  return (
    <Field id={id} label={text} required={required} error={error}>
      <select
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass(error)}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const value =
            typeof option === "string" ? option : String(option.value);
          const text = typeof option === "string" ? option : option.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

// Selectable pills built on real radio inputs (keyboard and screen-reader friendly).
function RadioPills({
  id,
  legend,
  required,
  options,
  value,
  onChange,
  error,
  columns,
}) {
  return (
    <fieldset id={id} tabIndex={-1} className="outline-none">
      <legend className="mb-1.5 text-sm font-medium text-neutral-800">
        {legend}
        {required && <span className="text-red-600"> *</span>}
      </legend>
      <div className={`grid gap-2 ${columns}`}>
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              className="peer sr-only"
            />
            <span
              className={`flex items-center justify-center rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold transition peer-checked:border-red-600 peer-checked:bg-red-600 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-red-200 hover:border-red-400 ${
                error
                  ? "border-red-400 text-neutral-700"
                  : "border-neutral-200 text-neutral-700"
              }`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </fieldset>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="border-t border-neutral-200 pt-7 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      )}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function DonorProfile() {
  const navigate = useNavigate();
  const profileState = useProfileLoader();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [referenceDataError, setReferenceDataError] = useState("");

  // Load public reference lists used by the form.
  useEffect(() => {
    let active = true;

    async function loadReferenceData() {
      try {
        const [bloodResponse, stateResponse] = await Promise.all([
          fetch(BLOOD_GROUPS_API),
          fetch(STATES_API),
        ]);
        if (!bloodResponse.ok || !stateResponse.ok) {
          throw new Error("Could not load blood groups or states.");
        }
        const [bloodData, stateData] = await Promise.all([
          bloodResponse.json(),
          stateResponse.json(),
        ]);
        if (active) {
          setBloodGroups(
            bloodData.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          );
          setStates(
            stateData.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          );
        }
      } catch (error) {
        if (active)
          setReferenceDataError(error.message || "Could not load form data.");
      }
    }

    loadReferenceData();
    return () => {
      active = false;
    };
  }, []);

  // Load districts whenever the selected state changes.
  useEffect(() => {
    let active = true;
    setDistricts([]);
    setSubDistricts([]);
    if (!form.state)
      return () => {
        active = false;
      };

    fetch(`${DISTRICTS_API}?state=${encodeURIComponent(form.state)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load districts.");
        return response.json();
      })
      .then((data) => {
        if (active)
          setDistricts(
            data.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          );
      })
      .catch((error) => {
        if (active) setReferenceDataError(error.message);
      });

    return () => {
      active = false;
    };
  }, [form.state]);

  // Load sub-districts whenever the selected district changes.
  useEffect(() => {
    let active = true;
    setSubDistricts([]);
    if (!form.district)
      return () => {
        active = false;
      };

    fetch(`${SUB_DISTRICTS_API}?district=${encodeURIComponent(form.district)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load sub-districts.");
        return response.json();
      })
      .then((data) => {
        if (active)
          setSubDistricts(
            data.map((item) => ({
              value: String(item.id),
              label: item.name,
            })),
          );
      })
      .catch((error) => {
        if (active) setReferenceDataError(error.message);
      });

    return () => {
      active = false;
    };
  }, [form.district]);

  // The profile belongs to a logged-in user, so send guests to the login page.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => {
      const next = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "state") {
        next.district = "";
        next.sub_district = "";
      } else if (name === "district") {
        next.sub_district = "";
      }
      return next;
    });
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setSessionExpired(false);

    const found = validate(form);
    setErrors(found);

    const firstError = Object.keys(found)[0];
    if (firstError) {
      setMessage("Please fix the highlighted fields.");
      document.getElementById(firstError)?.focus();
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate("/login");
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      phone_number: form.phone_number.replace(/\D/g, ""),
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      blood_group: Number(form.blood_group),
      weight_kg: Number(form.weight_kg),
      sub_district: Number(form.sub_district),
      last_donation_date: form.last_donation_date || null,
      availability: form.is_available ? "AVAILABLE" : "UNAVAILABLE",
    };

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${AUTH_SCHEME} ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        // The response had no JSON body.
      }

      if (response.status === 401) {
        setSessionExpired(true);
        setMessage("Your session has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        // DRF returns { field: ["message"] }. Show those next to the fields.
        const fieldErrors = {};
        const general = [];

        Object.entries(data).forEach(([key, value]) => {
          const text = Array.isArray(value) ? value.join(" ") : String(value);
          if (key in EMPTY_FORM) {
            fieldErrors[key] = text;
          } else {
            general.push(text);
          }
        });

        setErrors(fieldErrors);
        setMessage(
          general.join(" ") ||
            (Object.keys(fieldErrors).length
              ? "Please fix the highlighted fields."
              : "Could not create your profile. Please try again."),
        );
        return;
      }

      setCreated(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMessage(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedSubDistrict =
    subDistricts.find((item) => item.value === form.sub_district)?.label ||
    "your selected area";
  const selectedBloodGroup =
    bloodGroups.find((item) => item.value === form.blood_group)?.label ||
    "your blood group";

  const recentDonation =
    form.last_donation_date &&
    daysSince(form.last_donation_date) >= 0 &&
    daysSince(form.last_donation_date) < 90;

  // While we check whether this user already has a donor profile.
  if (!created && profileState.status === "loading") {
    return (
      <div className="min-h-screen bg-neutral-50 p-8 text-center text-neutral-600">
        Checking your donor profile...
      </div>
    );
  }

  // The user already has a donor profile, so do not show the sign-up form.
  if (!created && profileState.status === "ready") {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link to="/home" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
                <DropIcon className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                BloodLink
              </span>
            </Link>
            <Link
              to="/home"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-red-50 hover:text-red-700"
            >
              <ArrowLeftIcon />
              Back to home
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-xl px-4 py-12">
          <section className="flex flex-col items-center rounded-3xl border border-neutral-200 bg-white p-8 text-center sm:p-10">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
              <CheckIcon className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Donor profile already created
            </h1>
            <p className="mt-2 text-neutral-600">
              You are already registered as a donor, so you do not need to sign
              up again. You can view or update your details at any time.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                to={PATHS.profile}
                className="rounded-full bg-red-600 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
              >
                View my profile
              </Link>
              <Link
                to={PATHS.edit}
                className="rounded-full border border-neutral-300 px-7 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-red-600 hover:text-red-700"
              >
                Edit profile
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Top bar */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/home" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
              <DropIcon className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">BloodLink</span>
          </Link>

          <Link
            to="/home"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-red-50 hover:text-red-700"
          >
            <ArrowLeftIcon />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[22rem_1fr] lg:gap-8 lg:py-12">
        {/* Left: information panel */}
        <aside className="self-start rounded-3xl bg-red-600 p-7 text-white sm:p-8 lg:sticky lg:top-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600">
            <DropIcon className="h-6 w-6" />
          </span>

          <h1 className="mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Become a blood donor
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-red-100">
            Create your donor profile so that people who need your blood group
            can find you.
          </p>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-red-100">
            What happens next
          </h2>
          <ol className="mt-3 space-y-3 text-sm">
            {[
              "You create your profile with your blood group and location.",
              "People searching for your blood group in your area can find you.",
              "You choose whether to respond when you are available.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-red-600">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-2xl bg-red-700 p-4 text-sm">
            <p className="font-semibold">Before you start</p>
            <ul className="mt-2 space-y-1.5 text-red-100">
              <li>
                Age {MIN_AGE} to {MAX_AGE} years
              </li>
              <li>Weight of at least {MIN_WEIGHT} kg</li>
              <li>In good health on the day you donate</li>
            </ul>
          </div>
        </aside>

        {/* Right: form or success message */}
        {created ? (
          <section className="flex flex-col items-center justify-center rounded-3xl border border-neutral-200 bg-white p-8 text-center sm:p-14">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
              <CheckIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Your donor profile is ready
            </h2>
            <p className="mt-2 max-w-md text-neutral-600">
              Thank you for signing up as a donor. People who need{" "}
              {label(selectedBloodGroup)} blood in {selectedSubDistrict} can now
              find you.
            </p>
            <Link
              to="/home"
              className="mt-8 rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            >
              Back to home
            </Link>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-7 rounded-3xl border border-neutral-200 bg-white p-6 sm:p-10"
          >
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Donor profile
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Fields marked <span className="text-red-600">*</span> are
                required.
              </p>
            </div>

            {referenceDataError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {referenceDataError} Refresh the page and try again.
              </div>
            )}

            {message && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {message}{" "}
                {sessionExpired && (
                  <Link
                    to="/login"
                    className="font-semibold underline underline-offset-2"
                  >
                    Go to login
                  </Link>
                )}
              </div>
            )}

            <Section title="Personal details">
              <div className="sm:col-span-2">
                <TextInput
                  id="full_name"
                  label="Full name"
                  required
                  autoComplete="name"
                  placeholder="As on your ID"
                  value={form.full_name}
                  onChange={handleChange}
                  error={errors.full_name}
                />
              </div>

              <TextInput
                id="phone_number"
                label="Mobile number"
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                maxLength={14}
                value={form.phone_number}
                onChange={handleChange}
                error={errors.phone_number}
              />

              <TextInput
                id="date_of_birth"
                label="Date of birth"
                required
                type="date"
                autoComplete="bday"
                min={toISODate(yearsAgo(MAX_AGE + 1))}
                max={toISODate(yearsAgo(MIN_AGE))}
                value={form.date_of_birth}
                onChange={handleChange}
                error={errors.date_of_birth}
              />

              <div className="sm:col-span-2">
                <RadioPills
                  id="gender"
                  legend="Gender"
                  required
                  columns="grid-cols-3"
                  options={GENDERS}
                  value={form.gender}
                  onChange={handleChange}
                  error={errors.gender}
                />
              </div>
            </Section>

            <Section title="Blood details">
              <div className="sm:col-span-2">
                <RadioPills
                  id="blood_group"
                  legend="Blood group"
                  required
                  columns="grid-cols-4"
                  options={bloodGroups.map((group) => ({
                    value: group.value,
                    label: label(group.label),
                  }))}
                  value={form.blood_group}
                  onChange={handleChange}
                  error={errors.blood_group}
                />
              </div>

              <TextInput
                id="weight_kg"
                label="Weight (kg)"
                required
                type="number"
                inputMode="decimal"
                min={MIN_WEIGHT}
                step="0.1"
                placeholder="For example 62"
                value={form.weight_kg}
                onChange={handleChange}
                error={errors.weight_kg}
              />

              <div>
                <TextInput
                  id="last_donation_date"
                  label="Last donation date"
                  type="date"
                  max={toISODate(new Date())}
                  hint="Leave empty if you have never donated."
                  value={form.last_donation_date}
                  onChange={handleChange}
                  error={errors.last_donation_date}
                />
                {recentDonation && (
                  <p className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
                    Donors usually wait at least 3 months between donations. You
                    may want to switch off availability below for now.
                  </p>
                )}
              </div>
            </Section>

            <Section
              title="Location"
              description="Used to match you with people who need blood nearby."
            >
              <SelectInput
                id="state"
                label="State / Union Territory"
                required
                placeholder="Select your state"
                options={states}
                value={form.state}
                onChange={handleChange}
                error={errors.state}
                disabled={!states.length}
              />

              <SelectInput
                id="district"
                label="District"
                required
                placeholder={
                  form.state ? "Select your district" : "Select a state first"
                }
                options={districts}
                value={form.district}
                onChange={handleChange}
                error={errors.district}
                disabled={!form.state || !districts.length}
              />

              <div className="sm:col-span-2">
                <SelectInput
                  id="sub_district"
                  label="Sub-district / Taluk"
                  required
                  placeholder={
                    form.district
                      ? "Select your sub-district"
                      : "Select a district first"
                  }
                  options={subDistricts}
                  value={form.sub_district}
                  onChange={handleChange}
                  error={errors.sub_district}
                  disabled={!form.district || !subDistricts.length}
                />
              </div>
            </Section>

            <Section title="Availability">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:col-span-2">
                <span>
                  <span className="block text-sm font-semibold text-neutral-900">
                    Available to donate
                  </span>
                  <span className="mt-0.5 block text-sm text-neutral-500">
                    Switch this off if you cannot donate right now. You can
                    change it later.
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  name="is_available"
                  checked={form.is_available}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="relative h-7 w-12 shrink-0 rounded-full bg-neutral-300 transition peer-checked:bg-red-600 peer-focus-visible:ring-4 peer-focus-visible:ring-red-200 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
                />
              </label>

              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-700">
                  <input
                    id="consent"
                    type="checkbox"
                    name="consent"
                    checked={form.consent}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={
                      errors.consent ? "consent-error" : undefined
                    }
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-neutral-300 accent-red-600"
                  />
                  <span>
                    I confirm that the details above are correct, and I agree to
                    be contacted by people who need my blood group.
                  </span>
                </label>
                <FieldError id="consent-error" error={errors.consent} />
              </div>
            </Section>

            <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-7 sm:flex-row sm:justify-end">
              <Link
                to="/home"
                className="rounded-full border border-neutral-300 px-6 py-3 text-center text-sm font-semibold text-neutral-700 transition hover:border-red-600 hover:text-red-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating profile..." : "Create donor profile"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default DonorProfile;
