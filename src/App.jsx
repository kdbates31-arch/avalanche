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
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [agentForm, setAgentForm] = useState(EMPTY_AGENT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [referralFilter, setReferralFilter] = useState("All");
  const [strengthFilter, setStrengthFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [callAgent, setCallAgent] = useState(null);
  const [logAgent, setLogAgent] = useState(null);
  const [logType, setLogType] = useState("Phone Call");
  const [logForm, setLogForm] = useState({ action_taken: "", notes: "", outcome: "", next_action: "" });

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

    const { data: logData, error: logError } = await supabase
      .from("engagements")
      .select("*")
      .order("engagement_date", { ascending: false });

    if (logError) {
      setMessage("Contacts loaded, but activity history failed: " + logError.message);
    }

    const grouped = {};
    (logData || []).forEach((item) => {
      if (!grouped[item.agency_id]) grouped[item.agency_id] = [];
      grouped[item.agency_id].push(item);
    });

    setAgents(data || []);
    setLogs(grouped);
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

  function startEdit(agent) {
    setEditingAgent({
      ...EMPTY_AGENT,
      ...agent,
      company_type: agent.company_type || "Insurance Agency",
      contact_role: agent.contact_role || "Agent",
      referral_source: agent.referral_source || "Cold Stop In",
      relationship_strength: agent.relationship_strength || "Developing",
      state: agent.state || "TX",
      relationship_status: agent.relationship_status || "Needs Follow Up",
      last_contact_date: agent.last_contact_date || "",
      next_follow_up_date: agent.next_follow_up_date || ""
    });
  }

  async function updateAgent(e) {
    e.preventDefault();
    if (!editingAgent) return;
    setMessage("");

    if (!editingAgent.agency_name.trim()) {
      setMessage("Company name is required.");
      return;
    }

    if (!editingAgent.agent_first_name.trim() && !editingAgent.agent_last_name.trim()) {
      setMessage("Contact first or last name is required.");
      return;
    }

    setSaving(true);

    const { id, name, days, ...payload } = editingAgent;
    payload.last_contact_date = payload.last_contact_date || null;
    payload.next_follow_up_date = payload.next_follow_up_date || nextFollowUp(payload.relationship_status, payload.last_contact_date || today());

    const { error } = await supabase
      .from("agencies")
      .update(payload)
      .eq("id", editingAgent.id);

    if (error) {
      setMessage("Update failed: " + error.message);
    } else {
      setMessage("Contact updated.");
      setEditingAgent(null);
      setSelectedAgent(null);
      await loadAgents();
    }

    setSaving(false);
  }

  async function moveToDoNotPursue(agent) {
    const confirmed = window.confirm("Move this contact to Do Not Pursue? They will stay saved, but disappear from active follow-up workflows.");
    if (!confirmed) return;

    const { error } = await supabase
      .from("agencies")
      .update({
        relationship_status: "Do Not Pursue",
        next_follow_up_date: null
      })
      .eq("id", agent.id);

    if (error) {
      setMessage("Move failed: " + error.message);
    } else {
      setMessage("Contact moved to Do Not Pursue.");
      setSelectedAgent(null);
      setEditingAgent(null);
      await loadAgents();
    }
  }

  async function deleteAgent(agent) {
    const confirmed = window.confirm("Delete this contact permanently? This cannot be undone.");
    if (!confirmed) return;

    const { error } = await supabase
      .from("agencies")
      .delete()
      .eq("id", agent.id);

    if (error) {
      setMessage("Delete failed: " + error.message);
    } else {
      setMessage("Contact deleted.");
      setSelectedAgent(null);
      setEditingAgent(null);
      await loadAgents();
    }
  }

  function emailSubject(agent) {
    return "Following up from CoolRoofs";
  }

  function emailBody(agent) {
    return `Hi ${agent.agent_first_name || ""},

`;
  }

  function emailHref(agent) {
    if (!agent.agent_email) return "#";
    return `mailto:${agent.agent_email}?cc=${encodeURIComponent(CC_EMAIL)}&subject=${encodeURIComponent(emailSubject(agent))}&body=${encodeURIComponent(emailBody(agent))}`;
  }

  async function emailAndLog(agent) {
    if (!agent.agent_email) {
      setMessage("No email address saved for this contact.");
      return;
    }

    const now = today();
    const next = nextFollowUp(agent.relationship_status, now);
    const subject = emailSubject(agent);
    const body = emailBody(agent);

    const { error: logError } = await supabase.from("engagements").insert([{
      agency_id: agent.id,
      engagement_type: "Email Sent",
      engagement_date: now,
      action_taken: "Email",
      notes: `Email opened from Avalanche CRM.

Subject: ${subject}

Body:
${body}`,
      outcome: "Email follow-up initiated",
      next_action: ""
    }]);

    if (logError) {
      setMessage("Email opened, but activity log failed: " + logError.message);
      window.location.href = emailHref(agent);
      return;
    }

    const { error: updateError } = await supabase
      .from("agencies")
      .update({
        last_contact_date: now,
        next_follow_up_date: next,
        last_engagement_type: "Email Sent",
        engagement_count: Number(agent.engagement_count || 0) + 1
      })
      .eq("id", agent.id);

    if (updateError) {
      setMessage("Email logged, but follow-up date reset failed: " + updateError.message);
    } else {
      setMessage("Email logged and follow-up date reset.");
    }

    await loadAgents();
    window.location.href = emailHref(agent);
  }

  function startLog(agent, type) {
    setLogAgent(agent);
    setLogType(type);
    setLogForm({
      action_taken: type === "Office Stop In" ? "Coffee" : "",
      notes: "",
      outcome: "",
      next_action: ""
    });
  }

  async function saveActivity(e) {
    e.preventDefault();

    if (!logAgent) return;

    if (!logForm.notes.trim()) {
      setMessage("Activity notes are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const now = today();
    const newStatus = logType === "Referral Received" ? "Active Referral Partner" : logAgent.relationship_status;
    const next = nextFollowUp(newStatus, now);

    const { error: logError } = await supabase.from("engagements").insert([{
      agency_id: logAgent.id,
      engagement_type: logType,
      engagement_date: now,
      action_taken: logForm.action_taken,
      notes: logForm.notes,
      outcome: logForm.outcome,
      next_action: logForm.next_action
    }]);

    if (logError) {
      setMessage("Activity save failed: " + logError.message);
      setSaving(false);
      return;
    }

    const updates = {
      last_contact_date: now,
      next_follow_up_date: next,
      last_engagement_type: logType,
      engagement_count: Number(logAgent.engagement_count || 0) + 1
    };

    if (logType === "Referral Received") {
      updates.relationship_status = "Active Referral Partner";
      updates.is_active_referral_partner = true;
      updates.referral_count = Number(logAgent.referral_count || 0) + 1;
      updates.last_referral_date = now;
    }

    const { error: updateError } = await supabase
      .from("agencies")
      .update(updates)
      .eq("id", logAgent.id);

    if (updateError) {
      setMessage("Activity saved, but contact update failed: " + updateError.message);
    } else {
      setMessage("Activity logged.");
    }

    setLogAgent(null);
    setLogForm({ action_taken: "", notes: "", outcome: "", next_action: "" });
    setSaving(false);
    await loadAgents();
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

  const roleOptions = useMemo(() => {
    const roles = enrichedAgents.map((a) => a.contact_role).filter(Boolean);
    return Array.from(new Set(roles)).sort();
  }, [enrichedAgents]);

  const categorySummary = useMemo(() => {
    return COMPANY_TYPES.map((type) => ({
      type,
      count: enrichedAgents.filter((a) => a.company_type === type).length
    })).filter((item) => item.count > 0);
  }, [enrichedAgents]);

  const directory = useMemo(() => {
    let list = [...enrichedAgents];
    const q = search.trim().toLowerCase();

    if (statusFilter !== "All") {
      list = list.filter((a) => a.relationship_status === statusFilter);
    }

    if (companyFilter !== "All") {
      list = list.filter((a) => a.company_type === companyFilter);
    }

    if (referralFilter !== "All") {
      list = list.filter((a) => a.referral_source === referralFilter);
    }

    if (strengthFilter !== "All") {
      list = list.filter((a) => a.relationship_strength === strengthFilter);
    }

    if (roleFilter !== "All") {
      list = list.filter((a) => a.contact_role === roleFilter);
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
  }, [enrichedAgents, search, statusFilter, companyFilter, referralFilter, strengthFilter, roleFilter]);

  function openFiltered(status) {
    setStatusFilter(status);
    setCompanyFilter("All");
    setReferralFilter("All");
    setStrengthFilter("All");
    setRoleFilter("All");
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

            {categorySummary.length > 0 && (
              <Section title="Relationship Categories" subtitle="Current contact mix by company type.">
                <div style={styles.summaryGrid}>
                  {categorySummary.map((item) => (
                    <button key={item.type} style={styles.summaryCard} onClick={() => { setCompanyFilter(item.type); setStatusFilter("All"); setReferralFilter("All"); setStrengthFilter("All"); setRoleFilter("All"); setSearch(""); setTab("contacts"); }}>
                      <span>{item.type}</span>
                      <b>{item.count}</b>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Priority Follow Ups" subtitle="Contacts that need attention now.">
              {dueNow.length === 0 ? <p>No hard follow-ups due.</p> : dueNow.slice(0, 10).map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} openCall={() => setCallAgent(agent)} emailAndLog={() => emailAndLog(agent)} />)}
            </Section>

            <Section title="VIP Relationship Suggestions" subtitle="Soft reminders, not sales pressure.">
              {vipSuggestions.length === 0 ? <p>No VIP suggestions right now.</p> : vipSuggestions.slice(0, 10).map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} soft />)}
            </Section>
          </div>
        )}

        {!loading && tab === "contacts" && (
          <div style={styles.stack}>
            <div style={styles.card}>
              <button style={styles.primary} onClick={() => { setSearch(""); setStatusFilter("All"); setCompanyFilter("All"); setReferralFilter("All"); setStrengthFilter("All"); setRoleFilter("All"); }}>Show All Contacts</button>
              <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts, companies, roles, sources..." />
              <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select style={styles.input} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
                <option>All</option>
                {COMPANY_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
              <select style={styles.input} value={referralFilter} onChange={(e) => setReferralFilter(e.target.value)}>
                <option>All</option>
                {REFERRAL_SOURCES.map((source) => <option key={source}>{source}</option>)}
              </select>
              <select style={styles.input} value={strengthFilter} onChange={(e) => setStrengthFilter(e.target.value)}>
                <option>All</option>
                {RELATIONSHIP_STRENGTH.map((strength) => <option key={strength}>{strength}</option>)}
              </select>
              <select style={styles.input} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option>All</option>
                {roleOptions.map((role) => <option key={role}>{role}</option>)}
              </select>
            </div>

            <Section title={`Contact Directory (${directory.length})`} subtitle="Search or filter by status, company type, referral source, or relationship strength.">
              {directory.length === 0 ? <p>No contacts match this filter.</p> : directory.map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} openCall={() => setCallAgent(agent)} emailAndLog={() => emailAndLog(agent)} />)}
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

      {selectedAgent && (
        <ContactProfile
          agent={selectedAgent}
          logs={logs[selectedAgent.id] || []}
          close={() => setSelectedAgent(null)}
          startEdit={startEdit}
          deleteAgent={deleteAgent}
          moveToDoNotPursue={moveToDoNotPursue}
          openCall={() => setCallAgent(selectedAgent)}
          emailAndLog={() => emailAndLog(selectedAgent)}
          startLog={startLog}
        />
      )}

      {callAgent && (
        <CallChoiceModal
          agent={callAgent}
          close={() => setCallAgent(null)}
          startLog={startLog}
        />
      )}

      {logAgent && (
        <ActivityLogModal
          agent={logAgent}
          type={logType}
          form={logForm}
          setForm={setLogForm}
          saveActivity={saveActivity}
          saving={saving}
          close={() => setLogAgent(null)}
        />
      )}

      {editingAgent && (
        <EditContactForm
          form={editingAgent}
          setForm={setEditingAgent}
          updateAgent={updateAgent}
          saving={saving}
          close={() => setEditingAgent(null)}
          nextFollowUp={nextFollowUp}
          today={today}
        />
      )}
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

function ContactRow({ agent, open, openCall, emailAndLog, soft }) {
  const label = agent.days === null ? "No trigger" : agent.days < 0 ? `${Math.abs(agent.days)} days past` : agent.days === 0 ? "Due today" : `${agent.days} days left`;
  return (
    <div style={soft ? styles.softRow : styles.row}>
      <div onClick={open} style={{ cursor: "pointer" }}>
        <b>{agent.name}</b>
        <p>{agent.agency_name}</p>
        <small>{agent.company_type || "No Type"} · {agent.contact_role || "No Role"}</small>
        <small>{agent.relationship_status || "No Status"} · {label}</small>
      </div>
      <div style={styles.actionRowSmall}>
        {(agent.agent_phone || agent.main_phone) && <button style={styles.miniButton} onClick={openCall}>Call</button>}
        {agent.agent_email && <button style={styles.miniButton} onClick={emailAndLog}>Email</button>}
        <button style={styles.miniButton} onClick={open}>Open</button>
      </div>
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

function ContactProfile({ agent, logs, close, startEdit, deleteAgent, moveToDoNotPursue, openCall, emailAndLog, startLog }) {
  const address = [agent.address, agent.city, agent.state].filter(Boolean).join(", ");
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={styles.smallButton} onClick={close}>Close</button>
        <h2>{agent.name}</h2>
        <p>{agent.agency_name}</p>
        <div style={styles.actionRow}>
          {(agent.agent_phone || agent.main_phone) && <button style={styles.smallButton} onClick={openCall}>Call</button>}
          {agent.agent_phone && <a style={styles.linkButton} href={`sms:${agent.agent_phone}`}>Text</a>}
          {address && <a style={styles.linkButton} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Map</a>}
          {agent.agent_email && <button style={styles.smallButton} onClick={emailAndLog}>Email</button>}
          <button style={styles.smallButton} onClick={() => startEdit(agent)}>Edit Contact</button>
          <button style={styles.warningButton} onClick={() => moveToDoNotPursue(agent)}>Do Not Pursue</button>
          <button style={styles.deleteButton} onClick={() => deleteAgent(agent)}>Delete Contact</button>
        </div>
        <div style={styles.actionRow}>
          <button style={styles.smallButton} onClick={() => startLog(agent, "Phone Call")}>Log Call</button>
          <button style={styles.smallButton} onClick={() => startLog(agent, "Text Message")}>Log Text</button>
          <button style={styles.smallButton} onClick={() => startLog(agent, "Office Stop In")}>Log Stop In</button>
          <button style={styles.smallButton} onClick={() => startLog(agent, "Referral Request")}>Referral Ask</button>
          <button style={styles.smallButton} onClick={() => startLog(agent, "Referral Received")}>Referral Won</button>
        </div>
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
        <div style={styles.cardInner}>
          <h3>Activity Timeline</h3>
          {logs.length === 0 ? (
            <p>No activity logged yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={styles.timelineItem}>
                <b>{log.engagement_type}</b>
                <p>{log.engagement_date}</p>
                {log.action_taken && <p><b>Action:</b> {log.action_taken}</p>}
                {log.notes && <p>{log.notes}</p>}
                {log.outcome && <p><b>Outcome:</b> {log.outcome}</p>}
                {log.next_action && <p><b>Next:</b> {log.next_action}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CallChoiceModal({ agent, close, startLog }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={styles.smallButton} onClick={close}>Cancel</button>
        <h2>Choose Number</h2>
        <p>{agent.name} · {agent.agency_name}</p>
        {agent.agent_phone ? <a style={styles.callButton} href={`tel:${agent.agent_phone}`}>Call Mobile: {agent.agent_phone}</a> : <div style={styles.disabledBox}>No mobile phone saved</div>}
        {agent.main_phone ? <a style={styles.callButton} href={`tel:${agent.main_phone}`}>Call Office: {agent.main_phone}</a> : <div style={styles.disabledBox}>No office phone saved</div>}
        <button style={styles.primary} onClick={() => { close(); startLog(agent, "Phone Call"); }}>Log Phone Call Notes</button>
      </div>
    </div>
  );
}

function ActivityLogModal({ agent, type, form, setForm, saveActivity, saving, close }) {
  function set(key, value) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={styles.smallButton} onClick={close}>Cancel</button>
        <h2>{type}</h2>
        <p>{agent.name} · {agent.agency_name}</p>
        <form style={styles.form} onSubmit={saveActivity}>
          {type === "Office Stop In" ? (
            <Select
              label="Action Taken"
              value={form.action_taken}
              options={["Coffee", "Brought Food", "Tacos", "Lunch Invite", "Dropped Marketing Material", "Met New Staff", "Other"]}
              onChange={(v) => set("action_taken", v)}
            />
          ) : type === "Text Message" ? (
            <Input label="Action Taken" value={form.action_taken || "Text Message"} onChange={(v) => set("action_taken", v)} />
          ) : (
            <Input label="Action Taken" value={form.action_taken} onChange={(v) => set("action_taken", v)} />
          )}
          <Textarea label="Activity Notes" value={form.notes} onChange={(v) => set("notes", v)} />
          <Textarea label="Outcome" value={form.outcome} onChange={(v) => set("outcome", v)} />
          <Input label="Next Action" value={form.next_action} onChange={(v) => set("next_action", v)} />
          <button style={styles.primary} disabled={saving}>{saving ? "Saving..." : "Save Activity"}</button>
        </form>
      </div>
    </div>
  );
}

function EditContactForm({ form, setForm, updateAgent, saving, close, nextFollowUp, today }) {
  function set(key, value) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={styles.smallButton} onClick={close}>Cancel</button>
        <h2>Edit Contact</h2>
        <form style={styles.form} onSubmit={updateAgent}>
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
          <button style={styles.primary} disabled={saving}>{saving ? "Saving..." : "Update Contact"}</button>
        </form>
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
  deleteButton: { borderRadius: 12, padding: "10px 12px", border: 0, fontWeight: 800, background: "#991b1b", color: "white" },
  warningButton: { borderRadius: 12, padding: "10px 12px", border: 0, fontWeight: 800, background: "#92400e", color: "white" },
  actionRow: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  actionRowSmall: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  miniButton: { borderRadius: 10, padding: "8px 10px", border: 0, fontWeight: 800 },
  linkButton: { borderRadius: 12, padding: "10px 12px", border: 0, fontWeight: 800, background: "white", color: "#020617", textDecoration: "none" },
  callButton: { display: "block", background: "white", color: "#020617", padding: 14, borderRadius: 14, marginTop: 10, textDecoration: "none", textAlign: "center", fontWeight: 800 },
  disabledBox: { background: "#1e293b", color: "#94a3b8", padding: 14, borderRadius: 14, marginTop: 10, textAlign: "center" },
  timelineItem: { borderTop: "1px solid #334155", paddingTop: 10, marginTop: 10 },
  message: { background: "#1e293b", padding: 12, borderRadius: 14, marginTop: 12 },
  stack: { display: "flex", flexDirection: "column", gap: 12, marginTop: 12 },
  card: { background: "#0f172a", padding: 14, borderRadius: 18, marginTop: 12 },
  cardInner: { background: "#1e293b", padding: 12, borderRadius: 14, marginTop: 12 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  summaryCard: { background: "#1e293b", color: "white", border: "1px solid #334155", borderRadius: 14, padding: 12, textAlign: "left" },
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
