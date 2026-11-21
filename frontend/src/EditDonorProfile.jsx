import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  API_URL,
  PATHS,
  apiRequest,
  useProfileLoader,
} from "../components/donor/donorShared";

const API_BASE = "https://blood-donation-finder-awce.onrender.com/api";

export default function EditDonorProfile() {
  const navigate = useNavigate();
  const { status, profile, error: profileError } = useProfileLoader();

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);

  const [form, setForm] = useState({
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
    availability: "UNAVAILABLE",
  });

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status !== "ready" || !profile) return;

    let active = true;

    async function loadOptions() {
      setLoadingOptions(true);
      setError("");

      try {
        const [stateResponse, groupResponse] = await Promise.all([
          fetch(`${API_BASE}/locations/states/`),
          fetch(`${API_BASE}/blood-groups/`),
        ]);

        if (!stateResponse.ok || !groupResponse.ok) {
          throw new Error("Could not load states or blood groups.");
        }

        const stateData = await stateResponse.json();
        const groupData = await groupResponse.json();

        const districtResponse = await fetch(
          `${API_BASE}/locations/districts/?state=${profile.state_id}`,
        );
        if (!districtResponse.ok) {
          throw new Error("Could not load districts.");
        }
        const districtData = await districtResponse.json();

        const subDistrictResponse = await fetch(
          `${API_BASE}/locations/sub-districts/?district=${profile.district_id}`,
        );
        if (!subDistrictResponse.ok) {
          throw new Error("Could not load sub-districts.");
        }
        const subDistrictData = await subDistrictResponse.json();

        if (!active) return;

        setStates(stateData);
        setBloodGroups(groupData);
        setDistricts(districtData);
        setSubDistricts(subDistrictData);

        setForm({
          full_name: profile.full_name || "",
          phone_number: profile.phone_number || "",
          date_of_birth: profile.date_of_birth?.slice(0, 10) || "",
          gender: profile.gender || "",
          blood_group: String(profile.blood_group || ""),
          weight_kg: profile.weight_kg || "",
          state: String(profile.state_id || ""),
          district: String(profile.district_id || ""),
          sub_district: String(profile.sub_district || ""),
          last_donation_date: profile.last_donation_date?.slice(0, 10) || "",
          availability: profile.availability || "UNAVAILABLE",
        });
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, [status, profile]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setSuccess("");
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
      const response = await fetch(
        `${API_BASE}/locations/districts/?state=${stateId}`,
      );
      if (!response.ok) throw new Error("Could not load districts.");
      setDistricts(await response.json());
    } catch (err) {
      setError(err.message);
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
      const response = await fetch(
        `${API_BASE}/locations/sub-districts/?district=${districtId}`,
      );
      if (!response.ok) throw new Error("Could not load sub-districts.");
      setSubDistricts(await response.json());
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      full_name: form.full_name.trim(),
      phone_number: form.phone_number,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      blood_group: Number(form.blood_group),
      weight_kg: form.weight_kg,
      sub_district: Number(form.sub_district),
      last_donation_date: form.last_donation_date || null,
      availability: form.availability,
    };

    try {
      const { response, data } = await apiRequest("PATCH", payload);

      if (!response.ok) {
        const messages = Object.entries(data)
          .map(([field, value]) => {
            const message = Array.isArray(value) ? value.join(" ") : value;
            return `${field}: ${message}`;
          })
          .join("\n");

        throw new Error(messages || "Could not update your profile.");
      }

      setSuccess("Your donor profile was updated successfully.");
      navigate(PATHS.profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return <p className="p-8 text-center">Loading your profile...</p>;
  }

  if (status === "none") {
    return (
      <div className="p-8 text-center">
        <p>You haven't created a donor profile yet.</p>
        <button
          onClick={() => navigate(PATHS.create)}
          className="mt-4 rounded bg-red-600 px-5 py-2 text-white"
        >
          Create donor profile
        </button>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <p className="p-8 text-center">
        Your session has expired. Please log in again.
      </p>
    );
  }

  if (status === "error") {
    return <p className="p-8 text-center text-red-600">{profileError}</p>;
  }

  if (loadingOptions) {
    return <p className="p-8 text-center">Loading your profile details...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">
          Edit Donor Profile
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Update your donor information below.
        </p>

        {error && (
          <div className="mb-4 whitespace-pre-line rounded bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded bg-green-50 p-3 text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block font-medium">Full name</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={updateField}
              required
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Phone number</label>
            <input
              name="phone_number"
              value={form.phone_number}
              onChange={updateField}
              required
              maxLength={10}
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Date of birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={updateField}
              required
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={updateField}
              required
              className="w-full rounded border p-2"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium">Blood group</label>
            <select
              name="blood_group"
              value={form.blood_group}
              onChange={updateField}
              required
              className="w-full rounded border p-2"
            >
              <option value="">Select blood group</option>
              {bloodGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium">Weight (kg)</label>
            <input
              type="number"
              name="weight_kg"
              value={form.weight_kg}
              onChange={updateField}
              min="45"
              step="0.1"
              required
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">
              State / Union Territory
            </label>
            <select
              value={form.state}
              onChange={handleStateChange}
              required
              className="w-full rounded border p-2"
            >
              <option value="">Select state</option>
              {states.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium">District</label>
            <select
              value={form.district}
              onChange={handleDistrictChange}
              required
              disabled={!form.state}
              className="w-full rounded border p-2"
            >
              <option value="">Select district</option>
              {districts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium">Sub-district</label>
            <select
              name="sub_district"
              value={form.sub_district}
              onChange={updateField}
              required
              disabled={!form.district}
              className="w-full rounded border p-2"
            >
              <option value="">Select sub-district</option>
              {subDistricts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium">Last donation date</label>
            <input
              type="date"
              name="last_donation_date"
              value={form.last_donation_date}
              onChange={updateField}
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium">Availability</label>
            <select
              name="availability"
              value={form.availability}
              onChange={updateField}
              className="w-full rounded border p-2"
            >
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-red-600 px-6 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => navigate(PATHS.profile)}
              className="rounded border px-6 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
