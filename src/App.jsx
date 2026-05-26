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
  return (
    <div
      style={{
        padding: 40,
        color: "white",
        background: "#06111f",
        minHeight: "100vh",
        fontFamily: "Arial"
      }}
    >
      <h1>Avalanche CRM</h1>

      <p>Your updated CRM structure has been successfully installed.</p>

      <h2>Included Features</h2>

      <ul>
        <li>15 Day Follow Up Logic</li>
        <li>30 Day Warm Relationship Logic</li>
        <li>60 Day Maintenance Relationship Logic</li>
        <li>VIP Soft Reminder Logic</li>
        <li>Company Types</li>
        <li>Referral Source Tracking</li>
        <li>Relationship Strength Tracking</li>
        <li>Email Logging Structure</li>
      </ul>

      <h2>Company Types</h2>

      <ul>
        {COMPANY_TYPES.map((type) => (
          <li key={type}>{type}</li>
        ))}
      </ul>

      <h2>Referral Sources</h2>

      <ul>
        {REFERRAL_SOURCES.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>

      <h2>Status Logic</h2>

      <ul>
        {STATUSES.map((status) => (
          <li key={status}>{status}</li>
        ))}
      </ul>
    </div>
  );
}
    if (!form.agency_name.trim()) return setMessage("Agency name is required.");
    if (!form.agent_first_name.trim() && !form.agent_last_name.trim()) return setMessage("Agent first or last name is required.");

    const last = form.last_contact_date || null;
    const next = form.next_follow_up_date || nextFollowUp(form.relationship_status, last || today());
    const payload = { ...form, last_contact_date: last, next_follow_up_date: next };

    const { error } = await supabase.from("agencies").insert([payload]);
    if (error) setMessage("Save failed: " + error.message);
    else {
      setMessage("Agent saved.");
      setForm(EMPTY_AGENT);
      setTab("agents");
      setFilter("All");
      await loadData();
    }
  }

  async function saveEngagement(e) {
    e.preventDefault();
    if (!logAgent) return;
    if (!logNotes.trim()) return setMessage("Notes are required.");

    const now = today();
    const next = nextFollowUp(logAgent.relationship_status, now);

    const { error: logError } = await supabase.from("engagements").insert([{
      agency_id: logAgent.id,
      engagement_type: logType,
      engagement_date: now,
      action_taken: logType,
      notes: logNotes,
      outcome: "",
      next_action: ""
    }]);

    if (logError) return setMessage("Log failed: " + logError.message);

    const { error } = await supabase.from("agencies").update({
      last_contact_date: now,
      next_follow_up_date: next,
      last_engagement_type: logType,
      engagement_count: Number(logAgent.engagement_count || 0) + 1
    }).eq("id", logAgent.id);

    if (error) setMessage("Log saved, but contact date update failed: " + error.message);
    else setMessage("Engagement logged.");

    setLogAgent(null);
    setLogNotes("");
    await loadData();
  }

  async function emailAndLog(agent) {
    if (!agent.agent_email) return setMessage("No email address saved for this agent.");

    const now = today();
    const next = nextFollowUp(agent.relationship_status, now);
    const subject = emailSubject();
    const body = emailBody(agent);

    const { error: logError } = await supabase.from("engagements").insert([{
      agency_id: agent.id,
      engagement_type: "Email Sent",
      engagement_date: now,
      action_taken: "Email",
      notes: "Email opened from Avalanche CRM.\n\nSubject: " + subject + "\n\nBody:\n" + body,
      outcome: "Email follow-up initiated",
      next_action: ""
    }]);

    if (logError) {
      setMessage("Email opened, but log failed: " + logError.message);
      window.location.href = emailHref(agent);
      return;
    }

    const { error } = await supabase.from("agencies").update({
      last_contact_date: now,
      next_follow_up_date: next,
      last_engagement_type: "Email Sent",
      engagement_count: Number(agent.engagement_count || 0) + 1
    }).eq("id", agent.id);

    if (error) setMessage("Email logged, but date reset failed: " + error.message);
    else setMessage("Email logged and follow-up date reset.");

    await loadData();
    window.location.href = emailHref(agent);
  }

  async function changeStatus(agent, status) {
    const next = nextFollowUp(status, agent.last_contact_date || today());
    const { error } = await supabase.from("agencies").update({ relationship_status: status, next_follow_up_date: next }).eq("id", agent.id);
    if (error) setMessage("Status update failed: " + error.message);
    else await loadData();
  }

  const enriched = useMemo(() => {
    return agents.map((agent) => {
      const history = logs[agent.id] || [];
      const days = daysUntil(agent.next_follow_up_date);
      return { ...agent, name: fullName(agent), history, days };
    });
  }, [agents, logs]);

  const active = enriched.filter((a) => a.relationship_status !== "Do Not Pursue");
  const due = active.filter((a) => a.days !== null && a.days <= 0).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  const follow15 = active.filter((a) => ["New Prospect", "Needs Follow Up"].includes(a.relationship_status));
  const warm30 = active.filter((a) => a.relationship_status === "Warm Relationship");
  const partners = active.filter((a) => ["Active Referral Partner", "VIP Referral Partner"].includes(a.relationship_status) || a.is_active_referral_partner);

  const directory = useMemo(() => {
    let list = [...enriched];
    const q = search.toLowerCase().trim();

    if (filter === "All Active") list = list.filter((a) => a.relationship_status !== "Do Not Pursue");
    if (filter === "Due Now") list = list.filter((a) => a.relationship_status !== "Do Not Pursue" && a.days !== null && a.days <= 0);
    if (filter === "15 Day Due") list = list.filter((a) => ["New Prospect", "Needs Follow Up"].includes(a.relationship_status) && a.days !== null && a.days <= 0);
    if (filter === "30 Day Due") list = list.filter((a) => a.relationship_status === "Warm Relationship" && a.days !== null && a.days <= 0);
    if (!["All", "All Active", "Due Now", "15 Day Due", "30 Day Due"].includes(filter)) list = list.filter((a) => a.relationship_status === filter);

    if (q) list = list.filter((a) => [a.name, a.agency_name, a.agent_phone, a.main_phone, a.agent_email, a.city, a.notes, a.tags].filter(Boolean).join(" ").toLowerCase().includes(q));

    list.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
    return list;
  }, [enriched, search, filter]);

  function openList(nextFilter) {
    setSearch("");
    setFilter(nextFilter);
    setTab("agents");
  }

  return (
    <div style={styles.app}>
      <main style={styles.screen}>
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>Avalanche CRM</div>
            <h1 style={styles.h1}>{tab === "mission" ? "Today's Mission" : tab === "agents" ? "Agents" : tab === "add" ? "Add Agent" : tab === "partners" ? "Partners" : "Playbook"}</h1>
          </div>
          <button style={styles.smallButton} onClick={loadData}>Refresh</button>
        </header>

        {message && <div style={styles.message}>{message}</div>}
        {loading && <div style={styles.card}>Loading...</div>}

        {!loading && tab === "mission" && (
          <div style={styles.stack}>
            <div style={styles.tiles}>
              <Tile label="Due Today" value={due.length} danger onClick={() => openList("Due Now")} />
              <Tile label="15-Day Due" value={follow15.filter((a) => a.days !== null && a.days <= 0).length} onClick={() => openList("15 Day Due")} />
              <Tile label="30-Day Due" value={warm30.filter((a) => a.days !== null && a.days <= 0).length} onClick={() => openList("30 Day Due")} />
              <Tile label="Partners" value={partners.length} onClick={() => openList("Active Referral Partner")} />
            </div>
            <Section title="Priority Calls" subtitle="People who need contact now.">
              {due.length === 0 ? <p>No overdue follow-ups.</p> : due.slice(0, 12).map((a) => <AgentRow key={a.id} agent={a} openAgent={setSelected} openCall={setCallAgent} emailAndLog={emailAndLog} />)}
            </Section>
          </div>
        )}

        {!loading && tab === "agents" && (
          <div style={styles.stack}>
            <div style={styles.card}>
              <button style={styles.primary} onClick={() => { setSearch(""); setFilter("All"); }}>Show All Saved Agents</button>
              <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents, agencies, notes..." />
              <select style={styles.input} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option>All</option><option>All Active</option><option>Due Now</option><option>15 Day Due</option><option>30 Day Due</option>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <Section title={`Agent Directory (${directory.length})`} subtitle="Tap Open to see the profile and history.">
              {directory.length === 0 ? <p>No agents match this filter.</p> : directory.map((a) => <AgentRow key={a.id} agent={a} openAgent={setSelected} openCall={setCallAgent} emailAndLog={emailAndLog} />)}
            </Section>
          </div>
        )}

        {!loading && tab === "add" && <AddAgent form={form} setForm={setForm} saveAgent={saveAgent} nextFollowUp={nextFollowUp} today={today} />}

        {!loading && tab === "partners" && (
          <Section title="Referral Partners" subtitle="Protect these relationships.">
            {partners.length === 0 ? <p>No referral partners yet.</p> : partners.map((a) => <AgentRow key={a.id} agent={a} openAgent={setSelected} openCall={setCallAgent} emailAndLog={emailAndLog} />)}
          </Section>
        )}

        {!loading && tab === "playbook" && <Playbook />}
      </main>

      <nav style={styles.nav}>
        {["mission", "agents", "add", "partners", "playbook"].map((item) => <button key={item} style={tab === item ? styles.navOn : styles.navButton} onClick={() => setTab(item)}>{item}</button>)}
      </nav>

      {selected && <Profile agent={selected} logs={logs[selected.id] || []} close={() => setSelected(null)} openCall={setCallAgent} startLog={(agent, type) => { setLogAgent(agent); setLogType(type); setLogNotes(""); }} changeStatus={changeStatus} emailAndLog={emailAndLog} />}
      {callAgent && <CallModal agent={callAgent} close={() => setCallAgent(null)} startLog={(agent, type) => { setCallAgent(null); setLogAgent(agent); setLogType(type); setLogNotes(""); }} />}
      {logAgent && <LogModal agent={logAgent} type={logType} notes={logNotes} setNotes={setLogNotes} saveLog={saveEngagement} close={() => setLogAgent(null)} />}
    </div>
  );
}

function Tile({ label, value, onClick, danger }) {
  return <button onClick={onClick} style={danger ? styles.tileDanger : styles.tile}><span>{label}</span><b>{value}</b></button>;
}

function Section({ title, subtitle, children }) {
  return <section style={styles.card}><h2>{title}</h2><p style={styles.sub}>{subtitle}</p><div style={styles.stack}>{children}</div></section>;
}

function AgentRow({ agent, openAgent, openCall, emailAndLog }) {
  const label = agent.days === null ? "No cycle" : agent.days < 0 ? `${Math.abs(agent.days)} days overdue` : agent.days === 0 ? "Due today" : `${agent.days} days left`;
  return (
    <div style={styles.row}>
      <div style={styles.rowText} onClick={() => openAgent(agent)}>
        <b>{agent.name}</b>
        <p>{agent.agency_name}</p>
        <small>{label} · {agent.relationship_status || "No status"}</small>
      </div>
      <div style={styles.rowButtons}>
        <button onClick={() => openCall(agent)}>Call</button>
        {agent.agent_email && <button onClick={() => emailAndLog(agent)}>Email</button>}
        <button onClick={() => openAgent(agent)}>Open</button>
      </div>
    </div>
  );
}

function AddAgent({ form, setForm, saveAgent, nextFollowUp, today }) {
  function set(key, value) { setForm({ ...form, [key]: value }); }
  return (
    <form style={styles.form} onSubmit={saveAgent}>
      <Input label="Agency Name" value={form.agency_name} onChange={(v) => set("agency_name", v)} required />
      <Input label="First Name" value={form.agent_first_name} onChange={(v) => set("agent_first_name", v)} />
      <Input label="Last Name" value={form.agent_last_name} onChange={(v) => set("agent_last_name", v)} />
      <Input label="Mobile Phone" value={form.agent_phone} onChange={(v) => set("agent_phone", v)} />
      <Input label="Office Phone" value={form.main_phone} onChange={(v) => set("main_phone", v)} />
      <Input label="Email" value={form.agent_email} onChange={(v) => set("agent_email", v)} />
      <Input label="Address" value={form.address} onChange={(v) => set("address", v)} />
      <Input label="City" value={form.city} onChange={(v) => set("city", v)} />
      <Input label="State" value={form.state} onChange={(v) => set("state", v)} />
      <label>Status<select style={styles.input} value={form.relationship_status} onChange={(e) => setForm({ ...form, relationship_status: e.target.value, next_follow_up_date: nextFollowUp(e.target.value, form.last_contact_date || today()) || "" })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <Input type="date" label="Last Contact" value={form.last_contact_date} onChange={(v) => setForm({ ...form, last_contact_date: v, next_follow_up_date: nextFollowUp(form.relationship_status, v) || "" })} />
      <Input type="date" label="Next Follow Up" value={form.next_follow_up_date} onChange={(v) => set("next_follow_up_date", v)} />
      <Input label="Favorite Food / Drink" value={form.favorite_food} onChange={(v) => set("favorite_food", v)} />
      <Input label="Birthday" value={form.birthday} onChange={(v) => set("birthday", v)} />
      <Input label="Tags" value={form.tags} onChange={(v) => set("tags", v)} />
      <label>Memory Notes<textarea style={styles.input} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label>
      <button style={styles.primary}>Save Agent</button>
    </form>
  );
}

function Profile({ agent, logs, close, openCall, startLog, changeStatus, emailAndLog }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button onClick={close}>Close</button>
        <h2>{agent.name}</h2>
        <p>{agent.agency_name}</p>
        <div style={styles.rowButtons}>
          {(agent.agent_phone || agent.main_phone) && <button onClick={() => openCall(agent)}>Call</button>}
          {agent.agent_phone && <a href={`sms:${agent.agent_phone}`}>Text</a>}
          {agent.agent_email && <button onClick={() => emailAndLog(agent)}>Email</button>}
          <button onClick={() => startLog(agent, "Phone Call")}>Log Call</button>
          <button onClick={() => startLog(agent, "Office Stop In")}>Log Stop In</button>
        </div>
        <label>Status<select style={styles.input} value={agent.relationship_status || "New Prospect"} onChange={(e) => changeStatus(agent, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <h3>Memory</h3>
        <p>{agent.notes || "No memory notes yet."}</p>
        <h3>Timeline</h3>
        {logs.length === 0 ? <p>No history yet.</p> : logs.map((log) => <div key={log.id} style={styles.log}><b>{log.engagement_type}</b><p>{log.engagement_date}</p><p>{log.notes}</p></div>)}
      </div>
    </div>
  );
}

function CallModal({ agent, close, startLog }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button onClick={close}>Cancel</button>
        <h2>Choose Number</h2>
        {agent.agent_phone ? <a style={styles.callChoice} href={`tel:${agent.agent_phone}`}>Call Mobile: {agent.agent_phone}</a> : <p>No mobile phone saved</p>}
        {agent.main_phone ? <a style={styles.callChoice} href={`tel:${agent.main_phone}`}>Call Office: {agent.main_phone}</a> : <p>No office phone saved</p>}
        <button style={styles.primary} onClick={() => startLog(agent, "Phone Call")}>Log Phone Call Notes</button>
      </div>
    </div>
  );
}

function LogModal({ agent, type, notes, setNotes, saveLog, close }) {
  return (
    <div style={styles.overlay}>
      <form style={styles.sheet} onSubmit={saveLog}>
        <button type="button" onClick={close}>Cancel</button>
        <h2>{type}</h2>
        <p>{agent.name}</p>
        <textarea style={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
        <button style={styles.primary}>Save Engagement</button>
      </form>
    </div>
  );
}

function Playbook() {
  return <Section title="Playbook" subtitle="Relationship rules"><p>15-day cadence for new prospects and needs follow-up. 30-day cadence for warm relationships. Log every meaningful touch.</p></Section>;
}

function Input({ label, value, onChange, required, type = "text" }) {
  return <label>{label}<input style={styles.input} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} /></label>;
}

const styles = {
  app: { minHeight: "100vh", background: "#06111f", color: "white", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
  screen: { maxWidth: 900, margin: "0 auto", padding: "12px 12px 90px" },
  header: { position: "sticky", top: 0, background: "#0f172a", borderRadius: 18, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 },
  brand: { color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  h1: { margin: 0 },
  smallButton: { borderRadius: 12, padding: "10px 12px" },
  message: { background: "#1e293b", padding: 12, borderRadius: 14, marginTop: 12 },
  stack: { display: "flex", flexDirection: "column", gap: 12, marginTop: 12 },
  card: { background: "#0f172a", padding: 14, borderRadius: 18, marginTop: 12 },
  tiles: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  tile: { background: "#0f172a", color: "white", border: "1px solid #334155", borderRadius: 18, padding: 14, textAlign: "left" },
  tileDanger: { background: "#7f1d1d", color: "white", border: "1px solid #ef4444", borderRadius: 18, padding: 14, textAlign: "left" },
  sub: { color: "#94a3b8" },
  row: { background: "#1e293b", padding: 12, borderRadius: 16, display: "flex", flexDirection: "column", gap: 10 },
  rowText: { cursor: "pointer" },
  rowButtons: { display: "flex", flexWrap: "wrap", gap: 8 },
  input: { width: "100%", marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 12, border: "1px solid #334155" },
  form: { background: "#0f172a", padding: 14, borderRadius: 18, marginTop: 12 },
  primary: { width: "100%", padding: 13, borderRadius: 14, fontWeight: 800 },
  nav: { position: "fixed", bottom: 8, left: "50%", transform: "translateX(-50%)", width: "min(96vw, 700px)", background: "#0f172a", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, padding: 8, borderRadius: 22 },
  navButton: { padding: 10, borderRadius: 14, background: "transparent", color: "#94a3b8" },
  navOn: { padding: 10, borderRadius: 14, background: "white", color: "#020617" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12, zIndex: 50 },
  sheet: { background: "#0f172a", width: "min(100%, 650px)", maxHeight: "90vh", overflow: "auto", padding: 16, borderRadius: "24px 24px 12px 12px" },
  callChoice: { display: "block", background: "white", color: "#020617", padding: 14, borderRadius: 14, marginTop: 10, textDecoration: "none", textAlign: "center", fontWeight: 800 },
  log: { borderTop: "1px solid #334155", paddingTop: 10, marginTop: 10 }
};
