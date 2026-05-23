import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const emptyForm = {
    agency_name: "",
    main_phone: "",
    address: "",
    city: "",
    state: "TX",
    website: "",
    relationship_status: "New Prospect",
    last_contact_date: "",
    next_follow_up_date: "",
    notes: ""
  };

  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadAgencies();
  }, []);

  function todayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  function addDays(dateString, days) {
    const date = dateString ? new Date(dateString + "T00:00:00") : new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  function getFollowUpDays(status) {
    if (status === "Warm Relationship") return 30;
    if (status === "Needs Follow Up") return 15;
    return null;
  }

  function calculateNextFollowUp(status, lastContactDate) {
    const days = getFollowUpDays(status);
    if (!days) return "";
    const baseDate = lastContactDate || todayDateString();
    return addDays(baseDate, days);
  }

  function isDue(dateString) {
    if (!dateString) return false;
    return dateString <= todayDateString();
  }

  function daysUntil(dateString) {
    if (!dateString) return null;
    const today = new Date(todayDateString() + "T00:00:00");
    const target = new Date(dateString + "T00:00:00");
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  }

  async function loadAgencies() {
    setLoading(true);

    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .order("next_follow_up_date", { ascending: true, nullsFirst: false });

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

    const payload = {
      ...form,
      next_follow_up_date: form.next_follow_up_date || calculateNextFollowUp(form.relationship_status, form.last_contact_date)
    };

    const { error } = await supabase.from("agencies").insert([payload]);

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

  async function markContacted(agency) {
    const today = todayDateString();
    const nextDate = calculateNextFollowUp(agency.relationship_status, today);

    const newNote = window.prompt(
      "Enter notes from this contact:",
      agency.notes || ""
    );

    if (newNote === null) return;

    const { error } = await supabase
      .from("agencies")
      .update({
        last_contact_date: today,
        next_follow_up_date: nextDate,
        notes: newNote
      })
      .eq("id", agency.id);

    if (error) {
      setMessage("Error updating contact date: " + error.message);
    } else {
      setMessage("Contact logged. Next follow up date updated.");
      await loadAgencies();
    }
  }

  async function updateStatus(agency, newStatus) {
    const nextDate = calculateNextFollowUp(newStatus, agency.last_contact_date);

    const { error } = await supabase
      .from("agencies")
      .update({
        relationship_status: newStatus,
        next_follow_up_date: nextDate
      })
      .eq("id", agency.id);

    if (error) {
      setMessage("Error updating status: " + error.message);
    } else {
      setMessage("Status updated.");
      await loadAgencies();
    }
  }

  async function updateNotes(agency) {
    const newNote = window.prompt("Update notes:", agency.notes || "");
    if (newNote === null) return;

    const { error } = await supabase
      .from("agencies")
      .update({ notes: newNote })
      .eq("id", agency.id);

    if (error) {
      setMessage("Error updating notes: " + error.message);
    } else {
      setMessage("Notes updated.");
      await loadAgencies();
    }
  }

  const dueAgencies = agencies.filter((agency) => isDue(agency.next_follow_up_date));
  const totalAgencies = agencies.length;
  const activeReferrals = agencies.filter((agency) => agency.relationship_status === "Active Referrals").length;
  const followUpsDue = dueAgencies.length;
  const warmRelationships = agencies.filter((agency) => agency.relationship_status === "Warm Relationship").length;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h1 className="text-4xl font-bold mb-2">Avalanche CRM</h1>
          <p className="text-gray-600 text-lg">
            Track insurance agencies, last contact dates, notes, and follow up schedules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="Total Agencies" value={totalAgencies} />
          <MetricCard label="Active Referrals" value={activeReferrals} />
          <MetricCard label="Follow Ups Due" value={followUpsDue} />
          <MetricCard label="Warm Relationships" value={warmRelationships} />
        </div>

        {dueAgencies.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-3xl shadow p-6">
            <h2 className="text-2xl font-semibold mb-3 text-red-800">Follow Ups Due Now</h2>
            <div className="space-y-2">
              {dueAgencies.map((agency) => (
                <div key={agency.id} className="flex justify-between bg-white rounded-xl p-3">
                  <div>
                    <p className="font-semibold">{agency.agency_name}</p>
                    <p className="text-sm text-gray-600">Due: {agency.next_follow_up_date}</p>
                  </div>
                  <button
                    onClick={() => markContacted(agency)}
                    className="bg-black text-white px-4 py-2 rounded-xl"
                  >
                    Log Contact
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl shadow-lg p-6 lg:col-span-1">
            <h2 className="text-2xl font-semibold mb-4">Add Insurance Agency</h2>

            <form onSubmit={addAgency} className="space-y-4">
              <Input label="Agency Name" value={form.agency_name} onChange={(value) => setForm({ ...form, agency_name: value })} required />
              <Input label="Main Phone" value={form.main_phone} onChange={(value) => setForm({ ...form, main_phone: value })} />
              <Input label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
              <Input label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
              <Input label="State" value={form.state} onChange={(value) => setForm({ ...form, state: value })} />
              <Input label="Website" value={form.website} onChange={(value) => setForm({ ...form, website: value })} />
              <Input label="Last Contact Date" type="date" value={form.last_contact_date} onChange={(value) => setForm({ ...form, last_contact_date: value, next_follow_up_date: calculateNextFollowUp(form.relationship_status, value) })} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Status</label>
                <select
                  value={form.relationship_status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setForm({
                      ...form,
                      relationship_status: newStatus,
                      next_follow_up_date: calculateNextFollowUp(newStatus, form.last_contact_date)
                    });
                  }}
                  className="w-full border rounded-xl px-3 py-2"
                >
                  <option>New Prospect</option>
                  <option>Needs Follow Up</option>
                  <option>Warm Relationship</option>
                  <option>Active Referrals</option>
                  <option>Do Not Pursue</option>
                </select>
              </div>

              <Input label="Next Follow Up Date" type="date" value={form.next_follow_up_date} onChange={(value) => setForm({ ...form, next_follow_up_date: value })} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 min-h-24"
                  placeholder="Who you spoke with, what they said, claim preferences, relationship details, etc."
                />
              </div>

              <button type="submit" disabled={saving} className="w-full bg-black text-white px-4 py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving..." : "Save Agency"}
              </button>
            </form>

            {message && <div className="mt-4 bg-gray-100 rounded-xl p-3 text-sm text-gray-700">{message}</div>}
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Insurance Agencies</h2>
              <button onClick={loadAgencies} className="bg-gray-200 px-4 py-2 rounded-xl hover:bg-gray-300">Refresh</button>
            </div>

            {loading ? (
              <p className="text-gray-500">Loading agencies...</p>
            ) : agencies.length === 0 ? (
              <div className="bg-gray-100 rounded-2xl p-6 text-gray-600">No agencies saved yet. Add your first insurance agency using the form.</div>
            ) : (
              <div className="space-y-4">
                {agencies.map((agency) => {
                  const remaining = daysUntil(agency.next_follow_up_date);
                  return (
                    <div key={agency.id} className={`border rounded-2xl p-4 ${isDue(agency.next_follow_up_date) ? "bg-red-50 border-red-200" : "hover:bg-gray-50"}`}>
                      <div className="flex justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold">{agency.agency_name}</h3>
                          <p className="text-gray-600">{agency.main_phone || "No phone saved"}</p>
                          <p className="text-gray-600">{[agency.address, agency.city, agency.state].filter(Boolean).join(", ")}</p>
                          <p className="text-sm text-gray-600 mt-2">Last Contact: {agency.last_contact_date || "Not logged"}</p>
                          <p className={`text-sm font-semibold ${isDue(agency.next_follow_up_date) ? "text-red-700" : "text-gray-700"}`}>
                            Next Follow Up: {agency.next_follow_up_date || "Not scheduled"}
                            {remaining !== null && remaining >= 0 ? ` (${remaining} days)` : ""}
                            {remaining !== null && remaining < 0 ? ` (${Math.abs(remaining)} days overdue)` : ""}
                          </p>
                        </div>

                        <div className="text-right space-y-2">
                          <select
                            value={agency.relationship_status || "New Prospect"}
                            onChange={(e) => updateStatus(agency, e.target.value)}
                            className="border rounded-xl px-3 py-1 text-sm"
                          >
                            <option>New Prospect</option>
                            <option>Needs Follow Up</option>
                            <option>Warm Relationship</option>
                            <option>Active Referrals</option>
                            <option>Do Not Pursue</option>
                          </select>
                          <div className="space-x-3">
                            <button onClick={() => markContacted(agency)} className="text-blue-700 text-sm hover:underline">Log Contact</button>
                            <button onClick={() => updateNotes(agency)} className="text-blue-700 text-sm hover:underline">Edit Notes</button>
                            <button onClick={() => deleteAgency(agency.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                          </div>
                        </div>
                      </div>

                      {agency.notes && <div className="mt-3 bg-white rounded-xl p-3 text-gray-700 border">{agency.notes}</div>}
                    </div>
                  );
                })}
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

function Input({ label, value, onChange, required = false, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required ? " *" : ""}</label>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} className="w-full border rounded-xl px-3 py-2" />
    </div>
  );
}
