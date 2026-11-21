import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000/api";
const TOKEN_KEY = "authToken";

const ENDPOINTS = {
  donors: `${API_BASE}/donors/search/`,
  bloodGroups: `${API_BASE}/blood-groups/`,
  states: `${API_BASE}/locations/states/`,
  districts: `${API_BASE}/locations/districts/`,
  subDistricts: `${API_BASE}/locations/sub-districts/`,
  directRequests: `${API_BASE}/blood-requests/direct/`,
};

const EMPTY_FILTERS = {
  blood_group: "",
  state: "",
  district: "",
  sub_district: "",
};

const INITIAL_REQUEST_FORM = {
  units_needed: "1",
  hospital_name: "",
  hospital_address: "",
  urgency: "NORMAL",
  required_by: "",
  details: "",
};

function getResults(data) {
  return Array.isArray(data) ? data : data.results || [];
}

function BloodLinkLogo() {
  return (
    <Link to="/home" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 2.5c-.4 0-.8.2-1 .5C8.2 6.7 5 10.4 5 14.2A7 7 0 0 0 12 21a7 7 0 0 0 7-6.8c0-3.8-3.2-7.5-6-11.2-.2-.3-.6-.5-1-.5Z" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-neutral-900">
        BloodLink
      </span>
    </Link>
  );
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
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
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

function DonorCard({ donor, onSendRequest }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>

          <div className="min-w-0">
            <h2 className="truncate font-semibold text-neutral-900">
              {donor.full_name}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Registered blood donor
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          Available
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-red-50 p-3">
          <p className="text-xs text-neutral-500">Blood group</p>
          <p className="mt-1 text-lg font-bold text-red-700">
            {donor.blood_group_name || "Not specified"}
          </p>
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="text-xs text-neutral-500">Sub-district</p>
          <p className="mt-1 truncate text-sm font-semibold text-neutral-800">
            {donor.sub_district_name || "Not specified"}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-3">
        <p className="text-sm text-neutral-600">
          {[donor.district_name, donor.state_name].filter(Boolean).join(", ")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onSendRequest(donor)}
        className="mt-5 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
      >
        Send Blood Request
      </button>
    </article>
  );
}

function FindDonors() {
  const [bloodGroups, setBloodGroups] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [donors, setDonors] = useState([]);

  const [referenceLoading, setReferenceLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [referenceError, setReferenceError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Direct blood request form state.
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [requestForm, setRequestForm] = useState(INITIAL_REQUEST_FORM);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");

  // Load blood groups and states.
  useEffect(() => {
    let active = true;

    async function loadReferenceData() {
      setReferenceLoading(true);
      setReferenceError("");

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
      } catch (error) {
        if (active) {
          setReferenceError(error.message || "Could not load search filters.");
        }
      } finally {
        if (active) setReferenceLoading(false);
      }
    }

    loadReferenceData();

    return () => {
      active = false;
    };
  }, []);

  // Load districts when a state is selected.
  useEffect(() => {
    let active = true;

    setDistricts([]);
    setSubDistricts([]);

    if (!filters.state) return;

    async function loadDistricts() {
      try {
        const response = await fetch(
          `${ENDPOINTS.districts}?state=${encodeURIComponent(filters.state)}`,
        );

        if (!response.ok) {
          throw new Error("Could not load districts.");
        }

        const data = await response.json();

        if (active) setDistricts(getResults(data));
      } catch (error) {
        if (active) setReferenceError(error.message);
      }
    }

    loadDistricts();

    return () => {
      active = false;
    };
  }, [filters.state]);

  // Load sub-districts when a district is selected.
  useEffect(() => {
    let active = true;

    setSubDistricts([]);

    if (!filters.district) return;

    async function loadSubDistricts() {
      try {
        const response = await fetch(
          `${ENDPOINTS.subDistricts}?district=${encodeURIComponent(filters.district)}`,
        );

        if (!response.ok) {
          throw new Error("Could not load sub-districts.");
        }

        const data = await response.json();

        if (active) setSubDistricts(getResults(data));
      } catch (error) {
        if (active) setReferenceError(error.message);
      }
    }

    loadSubDistricts();

    return () => {
      active = false;
    };
  }, [filters.district]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => {
      const next = { ...current, [name]: value };

      if (name === "state") {
        next.district = "";
        next.sub_district = "";
      } else if (name === "district") {
        next.sub_district = "";
      }

      return next;
    });

    setReferenceError("");
  }

  async function handleSearch(event) {
    event.preventDefault();

    setSearchLoading(true);
    setSearchError("");
    setHasSearched(true);
    setDonors([]);

    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const url = params.toString()
        ? `${ENDPOINTS.donors}?${params.toString()}`
        : ENDPOINTS.donors;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not search for donors. Please try again.",
        );
      }

      setDonors(getResults(data));
    } catch (error) {
      setSearchError(error.message || "Could not connect to the server.");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    setDonors([]);
    setHasSearched(false);
    setSearchError("");
    setReferenceError("");
  }

  function openRequestForm(donor) {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setSelectedDonor(donor);
    setRequestForm(INITIAL_REQUEST_FORM);
    setRequestError("");
    setRequestSuccess("");
  }

  function closeRequestForm() {
    if (requestLoading) return;

    setSelectedDonor(null);
    setRequestError("");
  }

  function handleRequestFormChange(event) {
    const { name, value } = event.target;

    setRequestForm((current) => ({
      ...current,
      [name]: value,
    }));

    setRequestError("");
  }

  async function handleDirectRequestSubmit(event) {
    event.preventDefault();

    if (!selectedDonor) return;

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (
      !requestForm.hospital_name.trim() ||
      !requestForm.hospital_address.trim()
    ) {
      setRequestError("Please enter the hospital name and address.");
      return;
    }

    if (!requestForm.required_by) {
      setRequestError("Please select when the blood is required.");
      return;
    }

    const requiredDate = new Date(requestForm.required_by);

    if (
      Number.isNaN(requiredDate.getTime()) ||
      requiredDate.getTime() <= Date.now()
    ) {
      setRequestError("The required date and time must be in the future.");
      return;
    }

    const units = Number(requestForm.units_needed);

    if (!Number.isInteger(units) || units < 1) {
      setRequestError("Please enter at least one unit.");
      return;
    }

    const payload = {
      donor: selectedDonor.id,
      units_needed: units,
      hospital_name: requestForm.hospital_name.trim(),
      hospital_address: requestForm.hospital_address.trim(),
      urgency: requestForm.urgency,
      required_by: requiredDate.toISOString(),
      details: requestForm.details.trim(),
    };

    setRequestLoading(true);
    setRequestError("");
    setRequestSuccess("");

    try {
      const response = await fetch(ENDPOINTS.directRequests, {
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
        data = {};
      }

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const errorMessage =
          data.detail ||
          data.donor?.[0] ||
          data.required_by?.[0] ||
          data.hospital_name?.[0] ||
          data.hospital_address?.[0] ||
          "Could not send the blood request. Please try again.";

        throw new Error(errorMessage);
      }

      setRequestSuccess(
        `Your blood request has been sent to ${selectedDonor.full_name}.`,
      );

      setSelectedDonor(null);
      setRequestForm(INITIAL_REQUEST_FORM);
    } catch (error) {
      setRequestError(error.message || "Could not connect to the server.");
    } finally {
      setRequestLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <BloodLinkLogo />

          <div className="flex items-center gap-2">
            <Link
              to="/chats"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-red-50 hover:text-red-700"
            >
              Chats
            </Link>

            <Link
              to="/home"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-red-50 hover:text-red-700"
            >
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            Find available blood donors
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Find blood donors near you
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            Search for available donors by blood group and location. Donor
            contact details remain private in the search results.
          </p>
        </section>

        {requestSuccess && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {requestSuccess}
          </div>
        )}

        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Search filters</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Select one or more filters to narrow your search.
            </p>
          </div>

          {referenceError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {referenceError}
            </div>
          )}

          <form onSubmit={handleSearch}>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                id="blood_group"
                label="Blood group"
                value={filters.blood_group}
                onChange={handleFilterChange}
                options={bloodGroups}
                placeholder="All blood groups"
                disabled={referenceLoading}
              />

              <SelectField
                id="state"
                label="State / Union Territory"
                value={filters.state}
                onChange={handleFilterChange}
                options={states}
                placeholder="All states"
                disabled={referenceLoading}
              />

              <SelectField
                id="district"
                label="District"
                value={filters.district}
                onChange={handleFilterChange}
                options={districts}
                placeholder={
                  filters.state ? "All districts" : "Select a state first"
                }
                disabled={!filters.state}
              />

              <SelectField
                id="sub_district"
                label="Sub-district / Taluk"
                value={filters.sub_district}
                onChange={handleFilterChange}
                options={subDistricts}
                placeholder={
                  filters.district
                    ? "All sub-districts"
                    : "Select a district first"
                }
                disabled={!filters.district}
              />
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-neutral-100 pt-6 sm:flex-row">
              <button
                type="submit"
                disabled={searchLoading || referenceLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searchLoading ? "Searching..." : "Search donors"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-neutral-300 px-8 py-3 text-sm font-semibold text-neutral-700 transition hover:border-red-600 hover:text-red-700"
              >
                Clear filters
              </button>
            </div>
          </form>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Donor results</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {hasSearched
                  ? `${donors.length} donor${donors.length === 1 ? "" : "s"} found`
                  : "Choose your filters and search for donors."}
              </p>
            </div>
          </div>

          {searchError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {searchError}
            </div>
          )}

          {searchLoading && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-600">
              Searching for available donors...
            </div>
          )}

          {!searchLoading &&
            hasSearched &&
            !searchError &&
            donors.length === 0 && (
              <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-7 w-7"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16 16 4 4M8 11h6" />
                  </svg>
                </span>

                <h3 className="mt-4 text-lg font-semibold">No donors found</h3>

                <p className="mt-2 text-sm text-neutral-500">
                  Try changing your blood group or location filters.
                </p>
              </div>
            )}

          {!searchLoading && donors.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {donors.map((donor) => (
                <DonorCard
                  key={donor.id}
                  donor={donor}
                  onSendRequest={openRequestForm}
                />
              ))}
            </div>
          )}
        </section>

        <p className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
          <strong>Privacy notice:</strong> Donor phone numbers are not shown
          here. Contact details should only become available through the
          appropriate accepted blood-request workflow.
        </p>
      </main>

      {/* Direct blood request modal */}
      {selectedDonor && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRequestForm();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-modal-title"
            className="my-auto w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Direct blood request
                </span>

                <h2
                  id="request-modal-title"
                  className="mt-2 text-2xl font-bold text-neutral-900"
                >
                  Send request to {selectedDonor.full_name}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Blood group:{" "}
                  <strong className="text-red-700">
                    {selectedDonor.blood_group_name || "Not specified"}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={closeRequestForm}
                disabled={requestLoading}
                aria-label="Close request form"
                className="rounded-full px-3 py-1 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {requestError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {requestError}
              </div>
            )}

            <form onSubmit={handleDirectRequestSubmit} className="mt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="units_needed"
                    className="mb-1.5 block text-sm font-medium text-neutral-800"
                  >
                    Units needed
                  </label>

                  <input
                    id="units_needed"
                    name="units_needed"
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={requestForm.units_needed}
                    onChange={handleRequestFormChange}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="urgency"
                    className="mb-1.5 block text-sm font-medium text-neutral-800"
                  >
                    Urgency
                  </label>

                  <select
                    id="urgency"
                    name="urgency"
                    value={requestForm.urgency}
                    onChange={handleRequestFormChange}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="hospital_name"
                    className="mb-1.5 block text-sm font-medium text-neutral-800"
                  >
                    Hospital name
                  </label>

                  <input
                    id="hospital_name"
                    name="hospital_name"
                    type="text"
                    maxLength="200"
                    required
                    value={requestForm.hospital_name}
                    onChange={handleRequestFormChange}
                    placeholder="Enter hospital name"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="hospital_address"
                    className="mb-1.5 block text-sm font-medium text-neutral-800"
                  >
                    Hospital address
                  </label>

                  <textarea
                    id="hospital_address"
                    name="hospital_address"
                    rows="2"
                    maxLength="300"
                    required
                    value={requestForm.hospital_address}
                    onChange={handleRequestFormChange}
                    placeholder="Enter the hospital address"
                    className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="required_by"
                    className="mb-1.5 block text-sm font-medium text-neutral-800"
                  >
                    Blood required by
                  </label>

                  <input
                    id="required_by"
                    name="required_by"
                    type="datetime-local"
                    required
                    value={requestForm.required_by}
                    onChange={handleRequestFormChange}
                    min={new Date(Date.now() + 60000)
                      .toISOString()
                      .slice(0, 16)}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="details"
                    className="mb-1.5 block text-sm font-medium text-neutral-800"
                  >
                    Additional details (optional)
                  </label>

                  <textarea
                    id="details"
                    name="details"
                    rows="3"
                    value={requestForm.details}
                    onChange={handleRequestFormChange}
                    placeholder="Share any important information about the request."
                    className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100"
                  />
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeRequestForm}
                  disabled={requestLoading}
                  className="rounded-full border border-neutral-300 px-7 py-3 text-sm font-semibold text-neutral-700 transition hover:border-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={requestLoading}
                  className="rounded-full bg-red-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestLoading ? "Sending request..." : "Send blood request"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default FindDonors;
