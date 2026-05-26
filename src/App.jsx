import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const CC_EMAIL = "kristopher.bates@coolroofs.co";

const STATUSES = [
  "New Prospect",
  "Needs Follow Up",
  "Warm Relationship",
  "Maintenance Relationship",
  "Active Referral Partner",
  "VIP Referral Partner",
  "Cold",
  "Do Not Pursue"
];

const COMPANY_TYPES = [
  "Insurance Agency",
  "Real Estate Brokerage",
  "Property Management Company",
  "Home Inspection Company",
  "Public Adjusting Company",
  "Restoration Company",
  "Real Estate Investment Company"
];

const REFERRAL_SOURCES = [
  "Cold Stop In",
  "Warm Stop In",
  "Networking Event",
  "Agent Referral",
  "Realtor Referral",
  "Property Manager Referral",
  "Past Customer Referral",
  "Vendor Referral",
  "Social Media",
  "Existing Relationship"
];

const RELATIONSHIP_STRENGTH = [
  "Cold",
  "Developing",
  "Warm",
  "Strong",
  "Core Partner"
];

const EMPTY_AGENT = {
  company_type: "Insurance Agency",
  contact_role: "Agent",
  referral_source: "Cold Stop In",
  introduced_by: "",
  relationship_strength: "Developing",
  agency_name: "",
  agent_first_name: "",
  agent_last_name: "",
  agent_phone: "",
  main_phone: "",
  agent_email: "",
  address: "",
  city: "",
  state: "TX",
  relationship_status: "Needs Follow Up",
  favorite_food: "",
  birthday: "",
  tags: "",
  notes: "",
  last_contact_date: "",
  next_follow_up_date: ""
};

export default function App() {
  const [tab, setTab] = useState("mission");
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [agentForm, setAgentForm] = useState(EMPTY_AGENT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    loadAgents();
  }, []);

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  function addDays(dateText, count) {
    const d = dateText ? new Date(dateText + "T00:00:00") : new Date();
    d.setDate(d.getDate() + count);
    return d.toISOString().split("T")[0];
  }

  function cadence(status) {
    if (status === "New Prospect" || status === "Needs Follow Up") return 15;
    if (status === "Warm Relationship") return 30;
    if (status === "Maintenance Relationship") return 60;
    if (status === "VIP Referral Partner") return 45;
    return null;
  }

  function nextFollowUp(status, baseDate) {
    const days = cadence(status);
    return days ? addDays(baseDate || today(), days) : null;
  }

  function daysUntil(dateText) {
    if (!dateText) return null;
    const a = new Date(today() + "T00:00:00");
    const b = new Date(dateText + "T00:00:00");
    return Math.ceil((b - a) / 86400000);
  }

  function fullName(agent) {
    return [agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name || "Unnamed Contact";
  }

  async function loadAgents() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load contacts: " + error.message);
      setLoading(false);
      return;
    }

    setAgents(data || []);
    setLoading(false);
  }

  async function saveAgent(e) {
    e.preventDefault();
    setMessage("");

    if (!agentForm.agency_name.trim()) {
      setMessage("Company name is required.");
      return;
    }

    if (!agentForm.agent_first_name.trim() && !agentForm.agent_last_name.trim()) {
      setMessage("Contact first or last name is required.");
      return;
    }

    setSaving(true);

    const last = agentForm.last_contact_date || null;
    const next = agentForm.next_follow_up_date || nextFollowUp(agentForm.relationship_status, last || today());

    const payload = {
      ...agentForm,
      last_contact_date: last,
      next_follow_up_date: next
    };

    const { error } = await supabase.from("agencies").insert([payload]);

    if (error) {
      setMessage("Save failed: " + error.message);
    } else {
      setMessage("Contact saved.");
      setAgentForm(EMPTY_AGENT);
      setTab("contacts");
      await loadAgents();
    }

    setSaving(false);
  }

  const enrichedAgents = useMemo(() => {
    return agents.map((agent) => ({
      ...agent,
      name: fullName(agent),
      days: daysUntil(agent.next_follow_up_date)
    }));
  }, [agents]);

  const activeAgents = enrichedAgents.filter((a) => a.relationship_status !== "Do Not Pursue");
  const dueNow = activeAgents.filter((a) => a.days !== null && a.days <= 0 && a.relationship_status !== "VIP Referral Partner");
  const follow15 = activeAgents.filter((a) => ["New Prospect", "Needs Follow Up"].includes(a.relationship_status) && a.days !== null && a.days <= 0);
  const warm30 = activeAgents.filter((a) => a.relationship_status === "Warm Relationship" && a.days !== null && a.days <= 0);
  const maintenance60 = activeAgents.filter((a) => a.relationship_status === "Maintenance Relationship" && a.days !== null && a.days <= 0);
  const vipSuggestions = activeAgents.filter((a) => a.relationship_status === "VIP Referral Partner" && a.days !== null && a.days <= 0);

  const directory = useMemo(() => {
    let list = [...enrichedAgents];
    const q = search.trim().toLowerCase();

    if (statusFilter !== "All") {
      list = list.filter((a) => a.relationship_status === statusFilter);
    }

    if (companyFilter !== "All") {
      list = list.filter((a) => a.company_type === companyFilter);
    }

    if (q) {
      list = list.filter((a) => [
        a.name,
        a.agency_name,
        a.company_type,
        a.contact_role,
        a.referral_source,
        a.relationship_strength,
        a.agent_phone,
        a.main_phone,
        a.agent_email,
        a.city,
        a.notes
      ].filter(Boolean).join(" ").toLowerCase().includes(q));
    }

    return list.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  }, [enrichedAgents, search, statusFilter, companyFilter]);

  function openFiltered(status) {
    setStatusFilter(status);
    setCompanyFilter("All");
    setSearch("");
    setTab("contacts");
  }

  return (
    <div style={styles.app}>
      <main style={styles.screen}>
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>Avalanche CRM</div>
            <h1 style={styles.h1}>{tab === "mission" ? "Today's Mission" : tab === "contacts" ? "Contacts" : tab === "add" ? "Add Contact" : "Playbook"}</h1>
          </div>
          <button style={styles.smallButton} onClick={loadAgents}>Refresh</button>
        </header>

        {message && <div style={styles.message}>{message}</div>}
        {loading && <div style={styles.card}>Loading...</div>}

        {!loading && tab === "mission" && (
          <div style={styles.stack}>
            <div style={styles.tiles}>
              <Tile label="Due Today" value={dueNow.length} onClick={() => openFiltered("All")} danger />
              <Tile label="15-Day Due" value={follow15.length} onClick={() => openFiltered("Needs Follow Up")} />
              <Tile label="30-Day Due" value={warm30.length} onClick={() => openFiltered("Warm Relationship")} />
              <Tile label="60-Day Due" value={maintenance60.length} onClick={() => openFiltered("Maintenance Relationship")} />
              <Tile label="VIP Suggestions" value={vipSuggestions.length} onClick={() => openFiltered("VIP Referral Partner")} />
            </div>

            <Section title="Priority Follow Ups" subtitle="Contacts that need attention now.">
              {dueNow.length === 0 ? <p>No hard follow-ups due.</p> : dueNow.slice(0, 10).map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} />)}
            </Section>

            <Section title="VIP Relationship Suggestions" subtitle="Soft reminders, not sales pressure.">
              {vipSuggestions.length === 0 ? <p>No VIP suggestions right now.</p> : vipSuggestions.slice(0, 10).map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} soft />)}
            </Section>
          </div>
        )}

        {!loading && tab === "contacts" && (
          <div style={styles.stack}>
            <div style={styles.card}>
              <button style={styles.primary} onClick={() => { setSearch(""); setStatusFilter("All"); setCompanyFilter("All"); }}>Show All Contacts</button>
              <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts, companies, roles, sources..." />
              <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select style={styles.input} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
                <option>All</option>
                {COMPANY_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>

            <Section title={`Contact Directory (${directory.length})`} subtitle="Tap a contact to view details.">
              {directory.length === 0 ? <p>No contacts match this filter.</p> : directory.map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} />)}
            </Section>
          </div>
        )}

        {!loading && tab === "add" && (
          <AddContactForm
            form={agentForm}
            setForm={setAgentForm}
            saveAgent={saveAgent}
            saving={saving}
            nextFollowUp={nextFollowUp}
            today={today}
          />
        )}

        {!loading && tab === "playbook" && <Playbook />}
      </main>

      <nav style={styles.nav}>
        <button style={tab === "mission" ? styles.navOn : styles.navButton} onClick={() => setTab("mission")}>Mission</button>
        <button style={tab === "contacts" ? styles.navOn : styles.navButton} onClick={() => setTab("contacts")}>Contacts</button>
        <button style={tab === "add" ? styles.navOn : styles.navButton} onClick={() => setTab("add")}>Add</button>
        <button style={tab === "playbook" ? styles.navOn : styles.navButton} onClick={() => setTab("playbook")}>Playbook</button>
      </nav>

      {selectedAgent && <ContactProfile agent={selectedAgent} close={() => setSelectedAgent(null)} />}
    </div>
  );
}

function Tile({ label, value, onClick, danger }) {
  return (
    <button style={danger ? styles.tileDanger : styles.tile} onClick={onClick}>
      <span>{label}</span>
      <b>{value}</b>
    </button>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section style={styles.card}>
      <h2>{title}</h2>
      <p style={styles.sub}>{subtitle}</p>
      <div style={styles.stack}>{children}</div>
    </section>
  );
}

function ContactRow({ agent, open, soft }) {
  const label = agent.days === null ? "No trigger" : agent.days < 0 ? `${Math.abs(agent.days)} days past` : agent.days === 0 ? "Due today" : `${agent.days} days left`;
  return (
    <div style={soft ? styles.softRow : styles.row} onClick={open}>
      <b>{agent.name}</b>
      <p>{agent.agency_name}</p>
      <small>{agent.company_type || "No Type"} · {agent.contact_role || "No Role"}</small>
      <small>{agent.relationship_status || "No Status"} · {label}</small>
    </div>
  );
}

function AddContactForm({ form, setForm, saveAgent, saving, nextFollowUp, today }) {
  function set(key, value) {
    setForm({ ...form, [key]: value });
  }

  return (
    <form style={styles.form} onSubmit={saveAgent}>
      <Select label="Company Type" value={form.company_type} options={COMPANY_TYPES} onChange={(v) => set("company_type", v)} />
      <Input label="Contact Role" value={form.contact_role} onChange={(v) => set("contact_role", v)} />
      <Select label="Referral Source" value={form.referral_source} options={REFERRAL_SOURCES} onChange={(v) => set("referral_source", v)} />
      <Select label="Relationship Strength" value={form.relationship_strength} options={RELATIONSHIP_STRENGTH} onChange={(v) => set("relationship_strength", v)} />
      <Input label="Introduced By" value={form.introduced_by} onChange={(v) => set("introduced_by", v)} />

      <Input label="Company Name" value={form.agency_name} onChange={(v) => set("agency_name", v)} required />
      <Input label="First Name" value={form.agent_first_name} onChange={(v) => set("agent_first_name", v)} />
      <Input label="Last Name" value={form.agent_last_name} onChange={(v) => set("agent_last_name", v)} />
      <Input label="Mobile Phone" value={form.agent_phone} onChange={(v) => set("agent_phone", v)} />
      <Input label="Office Phone" value={form.main_phone} onChange={(v) => set("main_phone", v)} />
      <Input label="Email" value={form.agent_email} onChange={(v) => set("agent_email", v)} />
      <Input label="Address" value={form.address} onChange={(v) => set("address", v)} />
      <Input label="City" value={form.city} onChange={(v) => set("city", v)} />
      <Input label="State" value={form.state} onChange={(v) => set("state", v)} />

      <Select
        label="Relationship Status"
        value={form.relationship_status}
        options={STATUSES}
        onChange={(v) => setForm({ ...form, relationship_status: v, next_follow_up_date: nextFollowUp(v, form.last_contact_date || today()) || "" })}
      />

      <Input type="date" label="Last Contact" value={form.last_contact_date} onChange={(v) => setForm({ ...form, last_contact_date: v, next_follow_up_date: nextFollowUp(form.relationship_status, v) || "" })} />
      <Input type="date" label="Next Follow Up" value={form.next_follow_up_date} onChange={(v) => set("next_follow_up_date", v)} />
      <Input label="Favorite Food / Drink" value={form.favorite_food} onChange={(v) => set("favorite_food", v)} />
      <Input label="Birthday" value={form.birthday} onChange={(v) => set("birthday", v)} />
      <Input label="Tags" value={form.tags} onChange={(v) => set("tags", v)} />
      <Textarea label="Memory Notes" value={form.notes} onChange={(v) => set("notes", v)} />
      <button style={styles.primary} disabled={saving}>{saving ? "Saving..." : "Save Contact"}</button>
    </form>
  );
}

function ContactProfile({ agent, close }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={styles.smallButton} onClick={close}>Close</button>
        <h2>{agent.name}</h2>
        <p>{agent.agency_name}</p>
        <div style={styles.cardInner}>
          <p><b>Company Type:</b> {agent.company_type || "Not set"}</p>
          <p><b>Role:</b> {agent.contact_role || "Not set"}</p>
          <p><b>Status:</b> {agent.relationship_status || "Not set"}</p>
          <p><b>Strength:</b> {agent.relationship_strength || "Not set"}</p>
          <p><b>Referral Source:</b> {agent.referral_source || "Not set"}</p>
          <p><b>Introduced By:</b> {agent.introduced_by || "Not set"}</p>
          <p><b>Last Contact:</b> {agent.last_contact_date || "Not logged"}</p>
          <p><b>Next Follow Up:</b> {agent.next_follow_up_date || "No trigger"}</p>
        </div>
        <div style={styles.cardInner}>
          <p><b>Mobile:</b> {agent.agent_phone || "Not saved"}</p>
          <p><b>Office:</b> {agent.main_phone || "Not saved"}</p>
          <p><b>Email:</b> {agent.agent_email || "Not saved"}</p>
          <p><b>Notes:</b> {agent.notes || "No notes yet"}</p>
        </div>
      </div>
    </div>
  );
}

function Playbook() {
  return (
    <Section title="Playbook" subtitle="Current cadence logic">
      <p><b>New Prospect:</b> 15 day hard follow-up.</p>
      <p><b>Needs Follow Up:</b> 15 day hard follow-up.</p>
      <p><b>Warm Relationship:</b> 30 day hard follow-up.</p>
      <p><b>Maintenance Relationship:</b> 60 day hard follow-up.</p>
      <p><b>Active Referral Partner:</b> no automated sales trigger.</p>
      <p><b>VIP Referral Partner:</b> 45 day soft relationship suggestion.</p>
    </Section>
  );
}

function Input({ label, value, onChange, required = false, type = "text" }) {
  return (
    <label style={styles.label}>{label}
      <input style={styles.input} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label style={styles.label}>{label}
      <textarea style={styles.textarea} value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label style={styles.label}>{label}
      <select style={styles.input} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((x) => <option key={x}>{x}</option>)}
      </select>
    </label>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "#06111f", color: "white", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
  screen: { maxWidth: 900, margin: "0 auto", padding: "12px 12px 90px" },
  header: { position: "sticky", top: 0, background: "#0f172a", borderRadius: 18, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 },
  brand: { color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  h1: { margin: 0 },
  smallButton: { borderRadius: 12, padding: "10px 12px", border: 0, fontWeight: 800 },
  message: { background: "#1e293b", padding: 12, borderRadius: 14, marginTop: 12 },
  stack: { display: "flex", flexDirection: "column", gap: 12, marginTop: 12 },
  card: { background: "#0f172a", padding: 14, borderRadius: 18, marginTop: 12 },
  cardInner: { background: "#1e293b", padding: 12, borderRadius: 14, marginTop: 12 },
  tiles: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  tile: { background: "#0f172a", color: "white", border: "1px solid #334155", borderRadius: 18, padding: 14, textAlign: "left" },
  tileDanger: { background: "#7f1d1d", color: "white", border: "1px solid #ef4444", borderRadius: 18, padding: 14, textAlign: "left" },
  sub: { color: "#94a3b8" },
  row: { background: "#1e293b", padding: 12, borderRadius: 16, display: "flex", flexDirection: "column", gap: 4, cursor: "pointer" },
  softRow: { background: "#2f2a12", padding: 12, borderRadius: 16, display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", border: "1px solid #facc15" },
  input: { width: "100%", marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 12, border: "1px solid #334155" },
  textarea: { width: "100%", minHeight: 90, marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 12, border: "1px solid #334155" },
  label: { display: "block", fontWeight: 700, color: "#cbd5e1" },
  form: { background: "#0f172a", padding: 14, borderRadius: 18, marginTop: 12 },
  primary: { width: "100%", padding: 13, borderRadius: 14, fontWeight: 800, border: 0 },
  nav: { position: "fixed", bottom: 8, left: "50%", transform: "translateX(-50%)", width: "min(96vw, 700px)", background: "#0f172a", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 8, borderRadius: 22 },
  navButton: { padding: 10, borderRadius: 14, background: "transparent", color: "#94a3b8", border: 0, fontWeight: 800 },
  navOn: { padding: 10, borderRadius: 14, background: "white", color: "#020617", border: 0, fontWeight: 800 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12, zIndex: 50 },
  sheet: { background: "#0f172a", width: "min(100%, 650px)", maxHeight: "90vh", overflow: "auto", padding: 16, borderRadius: "24px 24px 12px 12px" }
};
