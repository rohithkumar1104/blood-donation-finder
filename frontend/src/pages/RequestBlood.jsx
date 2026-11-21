import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000/api";
const TOKEN_KEY = "authToken";

const ENDPOINTS = {
  requests: `${API_BASE}/blood-requests/`,
  bloodGroups: `${API_BASE}/blood-groups/`,
  states: `${API_BASE}/locations/states/`,
  districts: `${API_BASE}/locations/districts/`,
  subDistricts: `${API_BASE}/locations/sub-districts/`,
};

const INITIAL_FORM = {
  blood_group: "",
  state: "",
  district: "",
  sub_district: "",
  units_needed: "1",
  hospital_name: "",
  hospital_address: "",
  urgency: "NORMAL",
  required_by: "",
  description: "",
};

function getResults(data) {
  return Array.isArray(data) ? data : data.results || [];
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-neutral-800"
      >
        {label}
      </label>

      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100 disabled:opacity-50"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RequestBlood() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);

  const [bloodGroups, setBloodGroups] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;

    async function loadReferenceData() {
      try {
        const [bloodResponse, stateResponse] = await Promise.all([
          fetch(ENDPOINTS.bloodGroups),
          fetch(ENDPOINTS.states),
        ]);

        if (!bloodResponse.ok || !stateResponse.ok) {
          throw new Error("Could not load blood groups or states.");
        }

        const [bloodData, stateData] = await Promise.all([
          bloodResponse.json(),
          stateResponse.json(),
        ]);

        if (active) {
          setBloodGroups(getResults(bloodData));
          setStates(getResults(stateData));
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load form options.");
        }
      } finally {
        if (active) setReferenceLoading(false);
      }
    }

    loadReferenceData();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    let active = true;

    setDistricts([]);
    setSubDistricts([]);

    if (!form.state) return;

    async function loadDistricts() {
      try {
        const response = await fetch(
          `${ENDPOINTS.districts}?state=${encodeURIComponent(form.state)}`,
        );

        if (!response.ok) {
          throw new Error("Could not load districts.");
        }

        const data = await response.json();

        if (active) setDistricts(getResults(data));
      } catch (err) {
        if (active) setError(err.message);
      }
    }

    loadDistricts();

    return () => {
      active = false;
    };
  }, [form.state]);

  useEffect(() => {
    let active = true;

    setSubDistricts([]);

    if (!form.district) return;

    async function loadSubDistricts() {
      try {
        const response = await fetch(
          `${ENDPOINTS.subDistricts}?district=${encodeURIComponent(form.district)}`,
        );

        if (!response.ok) {
          throw new Error("Could not load sub-districts.");
        }

        const data = await response.json();

        if (active) setSubDistricts(getResults(data));
      } catch (err) {
        if (active) setError(err.message);
      }
    }

    loadSubDistricts();

    return () => {
      active = false;
    };
  }, [form.district]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const next = { ...current, [name]: value };

      if (name === "state") {
        next.district = "";
        next.sub_district = "";
      } else if (name === "district") {
        next.sub_district = "";
      }

      return next;
    });

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!localStorage.getItem(TOKEN_KEY)) {
      navigate("/login");
      return;
    }

    if (!form.blood_group) {
      setError("Please select the required blood group.");
      return;
    }

    if (!form.hospital_name.trim()) {
      setError("Please enter the hospital name.");
      return;
    }

    if (!form.required_by) {
      setError("Please select when the blood is required.");
      return;
    }

    const requiredDate = new Date(form.required_by);

    if (Number.isNaN(requiredDate.getTime()) || requiredDate <= new Date()) {
      setError("The required date and time must be in the future.");
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);

    const payload = {
      blood_group: Number(form.blood_group),
      sub_district: form.sub_district ? Number(form.sub_district) : null,
      units_needed: Number(form.units_needed),
      hospital_name: form.hospital_name.trim(),
      hospital_address: form.hospital_address.trim(),
      urgency: form.urgency,
      required_by: requiredDate.toISOString(),
      description: form.description.trim(),
    };

    setLoading(true);

    try {
      const response = await fetch(ENDPOINTS.requests, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Handle an empty response.
      }

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        const messages = Object.entries(data)
          .map(([field, value]) => {
            const message = Array.isArray(value)
              ? value.join(" ")
              : typeof value === "string"
                ? value
                : JSON.stringify(value);

            return `${field}: ${message}`;
          })
          .join(" ");

        throw new Error(messages || "Could not create your blood request.");
      }

      setSuccess("Your blood request has been submitted successfully.");
      setForm(INITIAL_FORM);
      setDistricts([]);
      setSubDistricts([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Could not connect to the backend server.");
    } finally {
      setLoading(false);
    }
  }

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

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mb-8">
          <span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
            Request blood donation
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Request blood when it matters most
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            Share your blood requirement with the BloodLink donor community.
            Provide accurate hospital and contact information so donors can
            understand your request.
          </p>
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-semibold">Blood request details</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Fields marked with * are required.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          {referenceLoading ? (
            <p className="py-8 text-center text-sm text-neutral-600">
              Loading blood groups and locations...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              <div>
                <h3 className="mb-4 font-semibold text-neutral-900">
                  Blood requirement
                </h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField
                    id="blood_group"
                    label="Required blood group *"
                    value={form.blood_group}
                    onChange={handleChange}
                    options={bloodGroups}
                    placeholder="Select blood group"
                  />

                  <div>
                    <label
                      htmlFor="units_needed"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Units needed *
                    </label>

                    <input
                      id="units_needed"
                      name="units_needed"
                      type="number"
                      min="1"
                      max="99"
                      required
                      value={form.units_needed}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="urgency"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Urgency *
                    </label>

                    <select
                      id="urgency"
                      name="urgency"
                      value={form.urgency}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="required_by"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Required date and time *
                    </label>

                    <input
                      id="required_by"
                      name="required_by"
                      type="datetime-local"
                      required
                      value={form.required_by}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-7">
                <h3 className="mb-4 font-semibold text-neutral-900">
                  Hospital and location
                </h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="hospital_name"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Hospital name *
                    </label>

                    <input
                      id="hospital_name"
                      name="hospital_name"
                      type="text"
                      maxLength="200"
                      required
                      value={form.hospital_name}
                      onChange={handleChange}
                      placeholder="Enter hospital name"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="hospital_address"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Hospital address
                    </label>

                    <textarea
                      id="hospital_address"
                      name="hospital_address"
                      rows="3"
                      maxLength="300"
                      value={form.hospital_address}
                      onChange={handleChange}
                      placeholder="Enter hospital address and nearby landmark"
                      className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                    />
                  </div>

                  <SelectField
                    id="state"
                    label="State / Union Territory"
                    value={form.state}
                    onChange={handleChange}
                    options={states}
                    placeholder="Select state"
                  />

                  <SelectField
                    id="district"
                    label="District"
                    value={form.district}
                    onChange={handleChange}
                    options={districts}
                    placeholder={
                      form.state ? "Select district" : "Select state first"
                    }
                    disabled={!form.state}
                  />

                  <div className="sm:col-span-2">
                    <SelectField
                      id="sub_district"
                      label="Sub-district / Taluk (optional)"
                      value={form.sub_district}
                      onChange={handleChange}
                      options={subDistricts}
                      placeholder={
                        form.district
                          ? "Select sub-district"
                          : "Select district first"
                      }
                      disabled={!form.district}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-7">
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Additional details
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Add any useful information about the blood requirement..."
                  className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
                Please make sure the blood group, hospital details, and required
                time are accurate. This is a public request visible to eligible
                BloodLink users.
              </div>

              <div className="flex flex-col gap-3 border-t border-neutral-100 pt-6 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Submitting request..." : "Submit blood request"}
                </button>

                <button
                  type="button"
                  onClick={() => setForm(INITIAL_FORM)}
                  disabled={loading}
                  className="rounded-full border border-neutral-300 px-8 py-3 text-sm font-semibold text-neutral-700 transition hover:border-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Clear form
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

export default RequestBlood;
