import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const CC_EMAIL = "kristopher.bates@coolroofs.co";
const STATUSES = ["New Prospect", "Needs Follow Up", "Warm Relationship", "Active Referral Partner", "VIP Referral Partner", "Cold", "Do Not Pursue"];
const SORTS = ["Most Overdue", "Name A-Z", "Highest Score", "Recently Contacted"];

const EMPTY_AGENT = {
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

const EMPTY_LOG = {
  engagement_type: "Phone Call",
  action_taken: "",
  notes: "",
  outcome: "",
  next_action: ""
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
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Most Overdue");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [callAgent, setCallAgent] = useState(null);
  const [logAgent, setLogAgent] = useState(null);
  const [logType, setLogType] = useState("Phone Call");
  const [logForm, setLogForm] = useState(EMPTY_LOG);

  useEffect(() => {
    loadData();
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
    if (status === "Active Referral Partner") return 21;
    if (status === "VIP Referral Partner") return 14;
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
    return [agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name || "Unnamed Agent";
  }

  function score(agent, history) {
    let value = 40;
    const d = daysUntil(agent.next_follow_up_date);
    if (agent.relationship_status === "Warm Relationship") value += 15;
    if (agent.relationship_status === "Active Referral Partner") value += 25;
    if (agent.relationship_status === "VIP Referral Partner") value += 35;
    if (agent.relationship_status === "Cold") value -= 15;
    if (agent.relationship_status === "Do Not Pursue") value = 0;
    if (d !== null && d < 0) value -= Math.min(35, Math.abs(d));
    value += Math.min(20, history.length * 4);
    value += Math.min(25, Number(agent.referral_count || 0) * 10);
    return Math.max(0, Math.min(100, value));
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
    return "mailto:" + agent.agent_email + "?cc=" + encodeURIComponent(CC_EMAIL) + "&subject=" + encodeURIComponent(emailSubject(agent)) + "&body=" + encodeURIComponent(emailBody(agent));
  }

  async function emailAndLog(agent) {
    if (!agent.agent_email) {
      setMessage("No email address saved for this agent.");
      return;
    }

    setMessage("");
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
      setMessage("Email opened, but log failed: " + logError.message);
      window.location.href = emailHref(agent);
      return;
    }

    const { error: updateError } = await supabase.from("agencies").update({
      last_contact_date: now,
      next_follow_up_date: next,
      last_engagement_type: "Email Sent",
      engagement_count: Number(agent.engagement_count || 0) + 1
    }).eq("id", agent.id);

    if (updateError) setMessage("Email logged, but date reset failed: " + updateError.message);
    else setMessage("Email logged and follow-up date reset.");

    await loadData();
    window.location.href = emailHref(agent);
  }

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: agentData, error: agentError } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false });

    if (agentError) {
      setMessage("Could not load agents: " + agentError.message);
      setLoading(false);
      return;
    }

    const { data: logData, error: logError } = await supabase
      .from("engagements")
      .select("*")
      .order("engagement_date", { ascending: false });

    if (logError) setMessage("Could not load history: " + logError.message);

    const grouped = {};
    (logData || []).forEach((item) => {
      if (!grouped[item.agency_id]) grouped[item.agency_id] = [];
      grouped[item.agency_id].push(item);
    });

    setAgents(agentData || []);
    setLogs(grouped);
    setLoading(false);
  }

  async function saveAgent(e) {
    e.preventDefault();
    setMessage("");

    if (!agentForm.agency_name.trim()) return setMessage("Agency name is required.");
    if (!agentForm.agent_first_name.trim() && !agentForm.agent_last_name.trim()) return setMessage("Agent first or last name is required.");

    setSaving(true);
    const last = agentForm.last_contact_date || null;
    const next = agentForm.next_follow_up_date || nextFollowUp(agentForm.relationship_status, last || today());

    const { error } = await supabase.from("agencies").insert([{ ...agentForm, last_contact_date: last, next_follow_up_date: next }]);

    if (error) setMessage("Save failed: " + error.message);
    else {
      setMessage("Agent saved.");
      setAgentForm(EMPTY_AGENT);
      setTab("agents");
      setFilter("All");
      await loadData();
    }
    setSaving(false);
  }

  function startLog(agent, type) {
    setLogAgent(agent);
    setLogType(type);
    setLogForm({ ...EMPTY_LOG, engagement_type: type, action_taken: type === "Office Stop In" ? "Coffee" : "" });
  }

  async function saveLog(e) {
    e.preventDefault();
    if (!logAgent) return;
    if (!logForm.notes.trim()) return setMessage("Notes are required.");

    setSaving(true);
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
      setMessage("Log failed: " + logError.message);
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

    const { error: updateError } = await supabase.from("agencies").update(updates).eq("id", logAgent.id);
    if (updateError) setMessage("Log saved, but agent update failed: " + updateError.message);
    else setMessage("Engagement logged.");

    setLogAgent(null);
    setLogForm(EMPTY_LOG);
    setSaving(false);
    await loadData();
  }

  async function changeStatus(agent, newStatus) {
    const next = nextFollowUp(newStatus, agent.last_contact_date || today());
    const { error } = await supabase.from("agencies").update({ relationship_status: newStatus, next_follow_up_date: next }).eq("id", agent.id);
    if (error) setMessage("Status failed: " + error.message);
    else await loadData();
  }

  async function archiveAgent(agent) {
    if (!window.confirm("Move this agent to Do Not Pursue?")) return;
    const { error } = await supabase.from("agencies").update({ relationship_status: "Do Not Pursue", next_follow_up_date: null }).eq("id", agent.id);
    if (error) setMessage("Archive failed: " + error.message);
    else {
      setSelectedAgent(null);
      await loadData();
    }
  }

  async function deleteAgent(agent) {
    if (!window.confirm("Delete this agent permanently?")) return;
    const { error } = await supabase.from("agencies").delete().eq("id", agent.id);
    if (error) setMessage("Delete failed: " + error.message);
    else {
      setSelectedAgent(null);
      await loadData();
    }
  }

  const enriched = useMemo(() => {
    return agents.map((agent) => {
      const history = logs[agent.id] || [];
      return {
        ...agent,
        name: fullName(agent),
        history,
        score: score(agent, history),
        days: daysUntil(agent.next_follow_up_date)
      };
    });
  }, [agents, logs]);

  const active = enriched.filter((a) => a.relationship_status !== "Do Not Pursue");
  const due = active.filter((a) => a.days !== null && a.days <= 0).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  const follow15 = active.filter((a) => a.relationship_status === "Needs Follow Up" || a.relationship_status === "New Prospect");
  const warm30 = active.filter((a) => a.relationship_status === "Warm Relationship");
  const partners = active.filter((a) => a.relationship_status === "Active Referral Partner" || a.relationship_status === "VIP Referral Partner" || a.is_active_referral_partner);

  const directory = useMemo(() => {
    let list = [...enriched];
    const q = search.trim().toLowerCase();

    if (filter === "All Active") list = list.filter((a) => a.relationship_status !== "Do Not Pursue");
    else if (filter === "Due Now") list = list.filter((a) => a.relationship_status !== "Do Not Pursue" && a.days !== null && a.days <= 0);
    else if (filter === "15 Day Due") list = list.filter((a) => ["New Prospect", "Needs Follow Up"].includes(a.relationship_status) && a.days !== null && a.days <= 0);
    else if (filter === "30 Day Due") list = list.filter((a) => a.relationship_status === "Warm Relationship" && a.days !== null && a.days <= 0);
    else if (filter !== "All") list = list.filter((a) => a.relationship_status === filter);

    if (q) {
      list = list.filter((a) => [a.name, a.agency_name, a.agent_phone, a.main_phone, a.agent_email, a.city, a.tags, a.notes, a.favorite_food].filter(Boolean).join(" ").toLowerCase().includes(q));
    }

    if (sort === "Most Overdue") list.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
    if (sort === "Name A-Z") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "Highest Score") list.sort((a, b) => b.score - a.score);
    if (sort === "Recently Contacted") list.sort((a, b) => String(b.last_contact_date || "").localeCompare(String(a.last_contact_date || "")));

    return list;
  }, [enriched, search, filter, sort]);

  function openList(newFilter) {
    setSearch("");
    setSort("Most Overdue");
    setFilter(newFilter);
    setTab("agents");
  }

  return (
    <div className="app">
      <style>{css}</style>
      <main className="screen">
        <header className="header">
          <div>
            <div className="brand">Avalanche CRM</div>
            <h1>{tab === "mission" ? "Today's Mission" : tab === "agents" ? "Agents" : tab === "add" ? "Add Agent" : tab === "partners" ? "Partners" : "Playbook"}</h1>
          </div>
          <button onClick={loadData}>Refresh</button>
        </header>

        {message && <div className="message">{message}</div>}
        {loading && <div className="card">Loading...</div>}

        {!loading && tab === "mission" && (
          <div className="stack">
            <div className="tiles">
              <button onClick={() => openList("Due Now")} className="tile danger"><span>Due Today</span><b>{due.length}</b></button>
              <button onClick={() => openList("15 Day Due")} className="tile"><span>15-Day Due</span><b>{follow15.filter((a) => a.days !== null && a.days <= 0).length}</b></button>
              <button onClick={() => openList("30 Day Due")} className="tile"><span>30-Day Due</span><b>{warm30.filter((a) => a.days !== null && a.days <= 0).length}</b></button>
              <button onClick={() => openList("Active Referral Partner")} className="tile"><span>Partners</span><b>{partners.length}</b></button>
            </div>
            <Section title="Priority Calls" subtitle="People who need contact now.">
              {due.length === 0 ? <Empty text="No overdue follow-ups." /> : due.slice(0, 12).map((a) => <AgentRow key={a.id} agent={a} openAgent={setSelectedAgent} openCall={setCallAgent} emailHref={emailHref} emailAndLog={emailAndLog} />)}
            </Section>
          </div>
        )}

        {!loading && tab === "agents" && (
          <div className="stack">
            <div className="card controls">
              <button className="primary" onClick={() => { setSearch(""); setFilter("All"); setSort("Name A-Z"); }}>Show All Saved Agents</button>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents, agencies, notes..." />
              <div className="grid2">
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option>All</option><option>All Active</option><option>Due Now</option><option>15 Day Due</option><option>30 Day Due</option>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>{SORTS.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
            </div>
            <Section title={`Agent Directory (${directory.length})`} subtitle="Tap Open to see the profile and history.">
              {directory.length === 0 ? <Empty text="No agents match this filter." /> : directory.map((a) => <AgentRow key={a.id} agent={a} openAgent={setSelectedAgent} openCall={setCallAgent} emailHref={emailHref} emailAndLog={emailAndLog} />)}
            </Section>
          </div>
        )}

        {!loading && tab === "add" && <AddAgent agentForm={agentForm} setAgentForm={setAgentForm} saveAgent={saveAgent} saving={saving} nextFollowUp={nextFollowUp} today={today} />}

        {!loading && tab === "partners" && (
          <Section title="Referral Partners" subtitle="Protect these relationships.">
            {partners.length === 0 ? <Empty text="No referral partners yet." /> : partners.map((a) => <AgentRow key={a.id} agent={a} openAgent={setSelectedAgent} openCall={setCallAgent} emailHref={emailHref} emailAndLog={emailAndLog} />)}
          </Section>
        )}

        {!loading && tab === "playbook" && <Playbook />}
      </main>

      <nav className="nav">
        {[['mission','Mission'],['agents','Agents'],['add','Add'],['partners','Partners'],['playbook','Playbook']].map(([key, label]) => <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>{label}</button>)}
      </nav>

      {selectedAgent && <Profile agent={selectedAgent} logs={logs[selectedAgent.id] || []} close={() => setSelectedAgent(null)} openCall={setCallAgent} startLog={startLog} changeStatus={changeStatus} archiveAgent={archiveAgent} deleteAgent={deleteAgent} emailHref={emailHref} emailAndLog={emailAndLog} />}
      {callAgent && <CallModal agent={callAgent} close={() => setCallAgent(null)} startLog={startLog} />}
      {logAgent && <LogModal agent={logAgent} type={logType} form={logForm} setForm={setLogForm} saveLog={saveLog} close={() => setLogAgent(null)} saving={saving} />}
    </div>
  );
}

function AgentRow({ agent, openAgent, openCall, emailHref, emailAndLog }) {
  const late = agent.days !== null && agent.days < 0;
  const label = agent.days === null ? "No cycle" : agent.days < 0 ? `${Math.abs(agent.days)} days overdue` : agent.days === 0 ? "Due today" : `${agent.days} days left`;
  return (
    <div className={late ? "row late" : "row"}>
      <div className="rowText" onClick={() => openAgent(agent)}>
        <div><b>{agent.name}</b><span>{agent.score}</span></div>
        <p>{agent.agency_name}</p>
        <small>{label} · {agent.relationship_status || "No status"}</small>
      </div>
      <div className="rowBtns">
        <button onClick={() => openCall(agent)}>Call</button>
        {agent.agent_email && <button onClick={() => emailAndLog(agent)}>Email</button>
        <button onClick={() => openAgent(agent)}>Open</button>
      </div>
    </div>
  );
}

function AddAgent({ agentForm, setAgentForm, saveAgent, saving, nextFollowUp, today }) {
  const set = (key, value) => setAgentForm({ ...agentForm, [key]: value });
  return (
    <form className="card form" onSubmit={saveAgent}>
      <Input label="Agency Name" value={agentForm.agency_name} onChange={(v) => set("agency_name", v)} required />
      <div className="grid2"><Input label="First Name" value={agentForm.agent_first_name} onChange={(v) => set("agent_first_name", v)} /><Input label="Last Name" value={agentForm.agent_last_name} onChange={(v) => set("agent_last_name", v)} /></div>
      <Input label="Mobile Phone" value={agentForm.agent_phone} onChange={(v) => set("agent_phone", v)} />
      <Input label="Office Phone" value={agentForm.main_phone} onChange={(v) => set("main_phone", v)} />
      <Input label="Email" value={agentForm.agent_email} onChange={(v) => set("agent_email", v)} />
      <Input label="Address" value={agentForm.address} onChange={(v) => set("address", v)} />
      <div className="grid2"><Input label="City" value={agentForm.city} onChange={(v) => set("city", v)} /><Input label="State" value={agentForm.state} onChange={(v) => set("state", v)} /></div>
      <Select label="Status" value={agentForm.relationship_status} options={STATUSES} onChange={(v) => setAgentForm({ ...agentForm, relationship_status: v, next_follow_up_date: nextFollowUp(v, agentForm.last_contact_date || today()) || "" })} />
      <div className="grid2"><Input type="date" label="Last Contact" value={agentForm.last_contact_date} onChange={(v) => setAgentForm({ ...agentForm, last_contact_date: v, next_follow_up_date: nextFollowUp(agentForm.relationship_status, v) || "" })} /><Input type="date" label="Next Follow Up" value={agentForm.next_follow_up_date} onChange={(v) => set("next_follow_up_date", v)} /></div>
      <Input label="Favorite Food / Drink" value={agentForm.favorite_food} onChange={(v) => set("favorite_food", v)} />
      <Input label="Birthday" value={agentForm.birthday} onChange={(v) => set("birthday", v)} />
      <Input label="Tags" value={agentForm.tags} onChange={(v) => set("tags", v)} />
      <Textarea label="Memory Notes" value={agentForm.notes} onChange={(v) => set("notes", v)} />
      <button className="primary" disabled={saving}>{saving ? "Saving..." : "Save Agent"}</button>
    </form>
  );
}

function Profile({ agent, logs, close, openCall, startLog, changeStatus, archiveAgent, deleteAgent, emailHref, emailAndLog }) {
  const address = [agent.address, agent.city, agent.state].filter(Boolean).join(", ");
  return (
    <div className="overlay"><div className="sheet"><div className="sheetHead"><button onClick={close}>Close</button><b>Agent Profile</b><span /></div><div className="hero"><div className="avatar">{agent.name.slice(0,1)}</div><h2>{agent.name}</h2><p>{agent.agency_name}</p></div><div className="quick">{(agent.agent_phone || agent.main_phone) && <button onClick={() => openCall(agent)}>Call</button>}{agent.agent_phone && <a href={`sms:${agent.agent_phone}`}>Text</a>}{agent.agent_email && <button onClick={() => emailAndLog(agent)}>Email</button>{address && <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}>Map</a>}</div><div className="quick"><button onClick={() => startLog(agent, "Phone Call")}>Log Call</button><button onClick={() => startLog(agent, "Office Stop In")}>Log Stop In</button><button onClick={() => startLog(agent, "Referral Request")}>Referral Ask</button><button onClick={() => startLog(agent, "Referral Received")}>Referral Won</button></div><div className="card"><Select label="Status" value={agent.relationship_status || "New Prospect"} options={STATUSES} onChange={(v) => changeStatus(agent, v)} /></div><div className="card"><h3>Memory</h3><p>{agent.notes || "No memory notes yet."}</p>{agent.favorite_food && <p><b>Food/Drink:</b> {agent.favorite_food}</p>}{agent.birthday && <p><b>Birthday:</b> {agent.birthday}</p>}</div><div className="card"><h3>Timeline</h3>{logs.length === 0 ? <p>No history yet.</p> : logs.map((log) => <div className="log" key={log.id}><b>{log.engagement_type}</b><small>{log.engagement_date}</small>{log.action_taken && <p><b>Action:</b> {log.action_taken}</p>}{log.notes && <p>{log.notes}</p>}{log.outcome && <p><b>Outcome:</b> {log.outcome}</p>}{log.next_action && <p><b>Next:</b> {log.next_action}</p>}</div>)}</div><div className="dangerBtns"><button onClick={() => archiveAgent(agent)}>Do Not Pursue</button><button onClick={() => deleteAgent(agent)}>Delete</button></div></div></div>
  );
}

function CallModal({ agent, close, startLog }) {
  return (
    <div className="overlay"><div className="sheet small"><div className="sheetHead"><button onClick={close}>Cancel</button><b>Choose Number</b><span /></div><p className="mutedCenter">{agent.name} · {agent.agency_name}</p>{agent.agent_phone ? <a className="callChoice" href={`tel:${agent.agent_phone}`}>Call Mobile: {agent.agent_phone}</a> : <div className="disabled">No mobile phone saved</div>}{agent.main_phone ? <a className="callChoice" href={`tel:${agent.main_phone}`}>Call Office: {agent.main_phone}</a> : <div className="disabled">No office phone saved</div>}<button className="secondary" onClick={() => { close(); startLog(agent, "Phone Call"); }}>Log Phone Call Notes</button></div></div>
  );
}

function LogModal({ agent, type, form, setForm, saveLog, close, saving }) {
  const set = (key, value) => setForm({ ...form, [key]: value });
  return (
    <div className="overlay"><form className="sheet small" onSubmit={saveLog}><div className="sheetHead"><button type="button" onClick={close}>Cancel</button><b>{type}</b><span /></div><p className="mutedCenter">{agent.name} · {agent.agency_name}</p>{type === "Office Stop In" && <Select label="Action Taken" value={form.action_taken} options={["Coffee", "Brought Food", "Tacos", "Lunch Invite", "Dropped Marketing Material", "Met New Staff", "Other"]} onChange={(v) => set("action_taken", v)} />}{type !== "Office Stop In" && type !== "Phone Call" && <Input label="Action Taken" value={form.action_taken} onChange={(v) => set("action_taken", v)} />}<Textarea label="Notes" value={form.notes} onChange={(v) => set("notes", v)} required /><Textarea label="Outcome" value={form.outcome} onChange={(v) => set("outcome", v)} /><Input label="Next Action" value={form.next_action} onChange={(v) => set("next_action", v)} /><button className="primary" disabled={saving}>{saving ? "Saving..." : "Save Engagement"}</button></form></div>
  );
}

function Playbook() { return <div className="stack"><Play title="New Prospect" text="First touch should be useful, not pushy." /><Play title="Needs Follow Up" text="15-day cadence. Call or stop in and log one useful detail." /><Play title="Warm Relationship" text="30-day cadence. Coffee, tacos, or a simple useful check-in." /><Play title="Referral Partner" text="Thank them fast, follow up professionally, and never let the relationship go cold." /></div>; }
function Play({ title, text }) { return <div className="card"><h3>{title}</h3><p>{text}</p></div>; }
function Section({ title, subtitle, children }) { return <section className="card"><h2>{title}</h2><p className="sub">{subtitle}</p><div className="stack tight">{children}</div></section>; }
function Empty({ text }) { return <div className="empty">{text}</div>; }
function Input({ label, value, onChange, required=false, type="text" }) { return <label className="field"><span>{label}{required ? " *" : ""}</span><input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} /></label>; }
function Textarea({ label, value, onChange, required=false }) { return <label className="field"><span>{label}{required ? " *" : ""}</span><textarea value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} /></label>; }
function Select({ label, value, options, onChange }) { return <label className="field"><span>{label}</span><select value={value || ""} onChange={(e) => onChange(e.target.value)}>{options.map((x) => <option key={x}>{x}</option>)}</select></label>; }

const css = `
*{box-sizing:border-box}body{margin:0;background:#050816;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}.app{min-height:100vh;background:radial-gradient(circle at top,#1e293b,#020617 55%)}.screen{max-width:980px;margin:0 auto;padding:12px 12px 96px}.header{position:sticky;top:0;z-index:10;background:rgba(15,23,42,.92);backdrop-filter:blur(18px);border:1px solid rgba(148,163,184,.2);border-radius:0 0 24px 24px;padding:16px;display:flex;justify-content:space-between;align-items:center}.brand{color:#94a3b8;text-transform:uppercase;font-size:12px;font-weight:800;letter-spacing:.12em}h1{margin:2px 0 0;font-size:28px}h2,h3,p{margin-top:0}.header button,.secondary{background:rgba(255,255,255,.08);color:white;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:10px 12px}.message,.card{background:rgba(15,23,42,.92);border:1px solid rgba(148,163,184,.18);border-radius:22px;padding:16px;margin-top:12px}.stack{display:flex;flex-direction:column;gap:12px}.tight{gap:8px}.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.tile{background:rgba(15,23,42,.92);border:1px solid rgba(148,163,184,.22);border-radius:20px;padding:14px;color:white;text-align:left}.tile span{display:block;color:#94a3b8;font-size:12px}.tile b{font-size:30px}.danger{background:rgba(127,29,29,.36);border-color:rgba(248,113,113,.4)}.row{background:rgba(30,41,59,.9);border:1px solid rgba(148,163,184,.16);border-radius:18px;padding:12px;display:flex;justify-content:space-between;gap:10px;align-items:center}.late{background:rgba(127,29,29,.28);border-color:rgba(248,113,113,.38)}.rowText{flex:1;cursor:pointer}.rowText div{display:flex;justify-content:space-between;gap:10px}.rowText span{background:white;color:#020617;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:900}.rowText p,.rowText small,.sub{color:#94a3b8}.rowBtns{display:flex;gap:7px}.rowBtns button,.rowBtns a,.quick button,.quick a,.callChoice{background:white;color:#020617;border:0;border-radius:14px;padding:10px 12px;font-weight:900;text-decoration:none;text-align:center}.controls{display:flex;flex-direction:column;gap:10px}.primary{width:100%;background:white;color:#020617;border:0;border-radius:16px;padding:14px;font-weight:900}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field{display:flex;flex-direction:column;gap:6px;color:#cbd5e1;font-size:13px;font-weight:800}input,select,textarea{width:100%;background:rgba(2,6,23,.85);color:white;border:1px solid rgba(148,163,184,.25);border-radius:14px;padding:12px}textarea{min-height:92px}.form{display:flex;flex-direction:column;gap:12px}.empty{background:rgba(2,6,23,.55);border-radius:16px;padding:14px;color:#cbd5e1}.nav{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);width:min(96vw,720px);background:rgba(15,23,42,.96);border:1px solid rgba(148,163,184,.22);border-radius:24px;padding:8px;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;z-index:40}.nav button{background:transparent;color:#94a3b8;border:0;border-radius:16px;padding:11px 3px;font-size:12px;font-weight:900}.nav .on{background:white;color:#020617}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:70;display:flex;align-items:flex-end;justify-content:center;padding:12px}.sheet{width:min(100%,760px);max-height:92vh;overflow:auto;background:#0f172a;border:1px solid rgba(148,163,184,.24);border-radius:30px 30px 18px 18px;padding:16px}.small{max-width:560px}.sheetHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.sheetHead button{background:rgba(255,255,255,.08);color:white;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:8px 10px}.hero{text-align:center;background:rgba(30,41,59,.75);border-radius:24px;padding:18px}.avatar{width:64px;height:64px;border-radius:22px;background:white;color:#020617;display:grid;place-items:center;margin:0 auto 10px;font-size:28px;font-weight:900}.quick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.log{border-top:1px solid rgba(148,163,184,.18);padding:12px 0}.log small{float:right;color:#94a3b8}.dangerBtns{display:flex;gap:10px;margin-top:12px}.dangerBtns button{background:rgba(127,29,29,.2);color:#fca5a5;border:1px solid rgba(248,113,113,.35);border-radius:14px;padding:10px}.mutedCenter{text-align:center;color:#94a3b8}.disabled{background:rgba(148,163,184,.08);color:#64748b;border:1px solid rgba(148,163,184,.12);border-radius:18px;padding:15px;text-align:center;font-weight:900}.callChoice,.secondary{display:block;width:100%;text-align:center;margin-top:10px;text-decoration:none}@media(max-width:640px){.tiles{grid-template-columns:repeat(2,1fr)}.row{flex-direction:column;align-items:stretch}.rowBtns{display:grid;grid-template-columns:repeat(3,1fr)}.grid2,.quick{grid-template-columns:1fr 1fr}.screen{padding:10px 10px 96px}.nav button{font-size:11px}}
`;
