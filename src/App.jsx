import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const emptyForm = {
    agency_name: "",
    main_phone: "",
    address: "",
    city: "",
    state: "TX",
    website: "",
    relationship_status: "New Prospect",
    notes: ""
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadAgencies();
  }, []);

  async function loadAgencies() {
    setLoading(true);

    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Error loading agencies: " + error.message);
    } else {
      setAgencies(data || []);
    }

    setLoading(false);
  }

  async function addAgency(e) {
    e.preventDefault();
    setMessage("");

    if (!form.agency_name.trim()) {
      setMessage("Agency name is required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("agencies").insert([form]);

    if (error) {
      setMessage("Error saving agency: " + error.message);
    } else {
      setMessage("Agency saved successfully.");
      setForm(emptyForm);
      await loadAgencies();
    }

    setSaving(false);
  }

  async function deleteAgency(id) {
    const confirmDelete = window.confirm("Delete this agency?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("agencies").delete().eq("id", id);

    if (error) {
      setMessage("Error deleting agency: " + error.message);
    } else {
      setMessage("Agency deleted.");
      await loadAgencies();
    }
  }

  const totalAgencies = agencies.length;
  const activeReferrals = agencies.filter(
    (agency) => agency.relationship_status === "Active Referrals"
  ).length;
  const followUpsDue = agencies.filter(
    (agency) => agency.relationship_status === "Needs Follow Up"
  ).length;
  const warmRelationships = agencies.filter(
    (agency) => agency.relationship_status === "Warm Relationship"
  ).length;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h1 className="text-4xl font-bold mb-2">Avalanche CRM</h1>
          <p className="text-gray-600 text-lg">
            Manage insurance agency relationships and referral opportunities for your roofing business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="Total Agencies" value={totalAgencies} />
          <MetricCard label="Active Referrals" value={activeReferrals} />
          <MetricCard label="Follow Ups Due" value={followUpsDue} />
          <MetricCard label="Warm Relationships" value={warmRelationships} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl shadow-lg p-6 lg:col-span-1">
            <h2 className="text-2xl font-semibold mb-4">Add Insurance Agency</h2>

            <form onSubmit={addAgency} className="space-y-4">
              <Input
                label="Agency Name"
                value={form.agency_name}
                onChange={(value) => setForm({ ...form, agency_name: value })}
                required
              />
              <Input
                label="Main Phone"
                value={form.main_phone}
                onChange={(value) => setForm({ ...form, main_phone: value })}
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(value) => setForm({ ...form, address: value })}
              />
              <Input
                label="City"
                value={form.city}
                onChange={(value) => setForm({ ...form, city: value })}
              />
              <Input
                label="State"
                value={form.state}
                onChange={(value) => setForm({ ...form, state: value })}
              />
              <Input
                label="Website"
                value={form.website}
                onChange={(value) => setForm({ ...form, website: value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Status
                </label>
                <select
                  value={form.relationship_status}
                  onChange={(e) => setForm({ ...form, relationship_status: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2"
                >
                  <option>New Prospect</option>
                  <option>Needs Follow Up</option>
                  <option>Warm Relationship</option>
                  <option>Active Referrals</option>
                  <option>Do Not Pursue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 min-h-24"
                  placeholder="Relationship notes, claim preferences, contact history, etc."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-black text-white px-4 py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Agency"}
              </button>
            </form>

            {message && (
              <div className="mt-4 bg-gray-100 rounded-xl p-3 text-sm text-gray-700">
                {message}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Insurance Agencies</h2>
              <button
                onClick={loadAgencies}
                className="bg-gray-200 px-4 py-2 rounded-xl hover:bg-gray-300"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-gray-500">Loading agencies...</p>
            ) : agencies.length === 0 ? (
              <div className="bg-gray-100 rounded-2xl p-6 text-gray-600">
                No agencies saved yet. Add your first insurance agency using the form.
              </div>
            ) : (
              <div className="space-y-4">
                {agencies.map((agency) => (
                  <div key={agency.id} className="border rounded-2xl p-4 hover:bg-gray-50">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">{agency.agency_name}</h3>
                        <p className="text-gray-600">{agency.main_phone || "No phone saved"}</p>
                        <p className="text-gray-600">
                          {[agency.address, agency.city, agency.state].filter(Boolean).join(", ")}
                        </p>
                        {agency.website && (
                          <a
                            className="text-blue-600 underline"
                            href={agency.website.startsWith("http") ? agency.website : `https://${agency.website}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {agency.website}
                          </a>
                        )}
                      </div>

                      <div className="text-right space-y-2">
                        <span className="inline-block bg-gray-200 px-3 py-1 rounded-full text-sm">
                          {agency.relationship_status || "New Prospect"}
                        </span>
                        <div>
                          <button
                            onClick={() => deleteAgency(agency.id)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {agency.notes && (
                      <div className="mt-3 bg-gray-100 rounded-xl p-3 text-gray-700">
                        {agency.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <p className="text-gray-500">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  );
}

function Input({ label, value, onChange, required = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required ? " *" : ""}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border rounded-xl px-3 py-2"
      />
    </div>
  );
}
