import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const STATUS_OPTIONS = [
  "New Prospect",
  "Needs Follow Up",
  "Warm Relationship",
  "Active Referral Partner",
  "VIP Referral Partner",
  "Cold",
  "Do Not Pursue"
];

const OFFICE_ACTIONS = [
  "Coffee",
  "Brought Food",
  "Tacos",
  "Lunch Invite",
  "Dropped Marketing Material",
  "Met New Staff",
  "Other"
];

const SORT_OPTIONS = [
  "Most Overdue",
  "Highest Score",
  "Lowest Score",
  "Name A-Z",
  "Recently Contacted"
];

const CC_EMAIL = "kristopher.bates@coolroofs.co";

const EMPTY_AGENT = {
  agency_name: "",
  agent_first_name: "",
  agent_last_name: "",
  agent_phone: "",
  agent_email: "",
  address: "",
  city: "",
  state: "TX",
  website: "",
  relationship_status: "Needs Follow Up",
  preferred_contact_method: "Phone",
  favorite_food: "",
  birthday: "",
  tags: "",
  notes: "",
  last_contact_date: "",
  next_follow_up_date: ""
};

const EMPTY_ENGAGEMENT = {
  engagement_type: "Phone Call",
  action_taken: "",
  notes: "",
  outcome: "",
  next_action: ""
};

export default function App() {
  const [activeTab, setActiveTab] = useState("mission");
  const [agents, setAgents] = useState([]);
  const [engagements, setEngagements] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [agentForm, setAgentForm] = useState(EMPTY_AGENT);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [quickActionAgent, setQuickActionAgent] = useState(null);
  const [quickActionType, setQuickActionType] = useState("");
  const [engagementForm, setEngagementForm] = useState(EMPTY_ENGAGEMENT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Most Overdue");
  const [directoryTitle, setDirectoryTitle] = useState("Agent Directory");

  useEffect(() => {
    loadDashboard();
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
    if (status === "New Prospect") return 15;
    if (status === "Needs Follow Up") return 15;
    if (status === "Warm Relationship") return 30;
    if (status === "Active Referral Partner") return 21;
    if (status === "VIP Referral Partner") return 14;
    return null;
  }

  function calculateNextFollowUp(status, baseDate) {
    const days = getFollowUpDays(status);
    if (!days) return null;
    return addDays(baseDate || todayDateString(), days);
  }

  function daysUntil(dateString) {
    if (!dateString) return null;
    const today = new Date(todayDateString() + "T00:00:00");
    const target = new Date(dateString + "T00:00:00");
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  }

  function displayName(agent) {
    return [agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name || "Unnamed Agent";
  }

  function emailLink(agent) {
    if (!agent.agent_email) return "#";
    const subject = encodeURIComponent(`Following up from CoolRoofs`);
    const body = encodeURIComponent(`Hi ${agent.agent_first_name || ""},

`);
    return `mailto:${agent.agent_email}?cc=${encodeURIComponent(CC_EMAIL)}&subject=${subject}&body=${body}`;
  }

  function openFilteredAgents(filter, title) {
    setSearch("");
    setSortBy("Most Overdue");
    setStatusFilter(filter);
    setDirectoryTitle(title || "Agent Directory");
    setActiveTab("agents");
  }

  function parseTags(tags) {
    if (!tags) return [];
    return String(tags).split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  function scoreAgent(agent, agentEngagements = []) {
    let score = 40;
    const days = daysUntil(agent.next_follow_up_date);

    if (agent.relationship_status === "Needs Follow Up") score += 5;
    if (agent.relationship_status === "Warm Relationship") score += 15;
    if (agent.relationship_status === "Active Referral Partner") score += 25;
    if (agent.relationship_status === "VIP Referral Partner") score += 35;
    if (agent.relationship_status === "Cold") score -= 15;
    if (agent.relationship_status === "Do Not Pursue") score = 0;

    if (days !== null && days < 0) score -= Math.min(35, Math.abs(days));
    if (days !== null && days >= 0 && days <= 7) score += 5;

    score += Math.min(20, agentEngagements.length * 4);
    score += Math.min(25, Number(agent.referral_count || 0) * 10);

    if (agent.last_contact_date) {
      const today = new Date(todayDateString() + "T00:00:00");
      const last = new Date(agent.last_contact_date + "T00:00:00");
      const daysSince = Math.ceil((today - last) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) score += 10;
      if (daysSince > 45) score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const { data: agentData, error: agentError } = await supabase
      .from("agencies")
      .select("*")
      .order("next_follow_up_date", { ascending: true, nullsFirst: false });

    if (agentError) {
      setMessage("Database error loading agents: " + agentError.message);
      setLoading(false);
      return;
    }

    const { data: engagementData, error: engagementError } = await supabase
      .from("engagements")
      .select("*")
      .order("engagement_date", { ascending: false });

    if (engagementError) {
      setMessage("Database error loading engagement history: " + engagementError.message);
    }

    const grouped = {};
    (engagementData || []).forEach((item) => {
      if (!grouped[item.agency_id]) grouped[item.agency_id] = [];
      grouped[item.agency_id].push(item);
    });

    setAgents(agentData || []);
    setEngagements(grouped);
    setLoading(false);
  }

  async function saveAgent(e) {
    e.preventDefault();
    setMessage("");

    if (!agentForm.agency_name.trim()) {
      setMessage("Agency name is required.");
      return;
    }

    if (!agentForm.agent_first_name.trim() && !agentForm.agent_last_name.trim()) {
      setMessage("Agent first or last name is required.");
      return;
    }

    setSaving(true);

    const lastDate = agentForm.last_contact_date || null;
    const nextDate = agentForm.next_follow_up_date || calculateNextFollowUp(agentForm.relationship_status, lastDate || todayDateString());

    const payload = {
      ...agentForm,
      last_contact_date: lastDate,
      next_follow_up_date: nextDate,
      is_active_referral_partner: agentForm.relationship_status === "Active Referral Partner" || agentForm.relationship_status === "VIP Referral Partner"
    };

    const { error } = await supabase.from("agencies").insert([payload]);

    if (error) {
      setMessage("Save failed: " + error.message);
    } else {
      setMessage("Agent saved.");
      setAgentForm(EMPTY_AGENT);
      setActiveTab("agents");
      await loadDashboard();
    }

    setSaving(false);
  }

  function openQuickAction(agent, type) {
    setQuickActionAgent(agent);
    setQuickActionType(type);
    setEngagementForm({
      engagement_type: type,
      action_taken: type === "Office Stop In" ? "Coffee" : "",
      notes: "",
      outcome: "",
      next_action: ""
    });
  }

  async function saveEngagement(e) {
    e.preventDefault();
    setMessage("");

    if (!quickActionAgent) return;
    if (!engagementForm.notes.trim()) {
      setMessage("Notes are required for an engagement.");
      return;
    }

    setSaving(true);

    const today = todayDateString();
    const statusAfterReferral = engagementForm.engagement_type === "Referral Received" ? "Active Referral Partner" : quickActionAgent.relationship_status;
    const nextDate = calculateNextFollowUp(statusAfterReferral, today);

    const engagementPayload = {
      agency_id: quickActionAgent.id,
      engagement_type: engagementForm.engagement_type,
      engagement_date: today,
      action_taken: engagementForm.action_taken,
      notes: engagementForm.notes,
      outcome: engagementForm.outcome,
      next_action: engagementForm.next_action
    };

    const { error: engagementError } = await supabase.from("engagements").insert([engagementPayload]);

    if (engagementError) {
      setMessage("Engagement save failed: " + engagementError.message);
      setSaving(false);
      return;
    }

    const updates = {
      last_contact_date: today,
      next_follow_up_date: nextDate,
      last_engagement_type: engagementForm.engagement_type,
      engagement_count: Number(quickActionAgent.engagement_count || 0) + 1
    };

    if (engagementForm.engagement_type === "Referral Received") {
      updates.relationship_status = "Active Referral Partner";
      updates.is_active_referral_partner = true;
      updates.referral_count = Number(quickActionAgent.referral_count || 0) + 1;
      updates.last_referral_date = today;
    }

    const { error: updateError } = await supabase.from("agencies").update(updates).eq("id", quickActionAgent.id);

    if (updateError) {
      setMessage("Engagement saved, but agent update failed: " + updateError.message);
    } else {
      setMessage("Engagement logged.");
    }

    setQuickActionAgent(null);
    setQuickActionType("");
    setEngagementForm(EMPTY_ENGAGEMENT);
    setSaving(false);
    await loadDashboard();
  }

  async function updateStatus(agent, status) {
    const baseDate = agent.last_contact_date || todayDateString();
    const nextDate = calculateNextFollowUp(status, baseDate);

    const { error } = await supabase
      .from("agencies")
      .update({
        relationship_status: status,
        next_follow_up_date: nextDate,
        is_active_referral_partner: status === "Active Referral Partner" || status === "VIP Referral Partner"
      })
      .eq("id", agent.id);

    if (error) {
      setMessage("Status update failed: " + error.message);
    } else {
      setMessage("Status updated.");
      await loadDashboard();
    }
  }

  async function archiveAgent(agent) {
    if (!window.confirm("Move this agent to Do Not Pursue?")) return;

    const { error } = await supabase
      .from("agencies")
      .update({ relationship_status: "Do Not Pursue", next_follow_up_date: null })
      .eq("id", agent.id);

    if (error) setMessage("Archive failed: " + error.message);
    else {
      setMessage("Moved to Do Not Pursue.");
      setSelectedAgent(null);
      await loadDashboard();
    }
  }

  async function deleteAgent(agent) {
    if (!window.confirm("Delete this agent permanently? This removes their history too.")) return;

    const { error } = await supabase.from("agencies").delete().eq("id", agent.id);

    if (error) setMessage("Delete failed: " + error.message);
    else {
      setMessage("Agent deleted.");
      setSelectedAgent(null);
      await loadDashboard();
    }
  }

  const enrichedAgents = useMemo(() => {
    return agents.map((agent) => {
      const agentEngagements = engagements[agent.id] || [];
      return {
        ...agent,
        name: displayName(agent),
        history: agentEngagements,
        score: scoreAgent(agent, agentEngagements),
        daysRemaining: daysUntil(agent.next_follow_up_date)
      };
    });
  }, [agents, engagements]);

  const activeAgents = enrichedAgents.filter((agent) => (agent.relationship_status || "") !== "Do Not Pursue");
  const missionAgents = activeAgents
    .filter((agent) => agent.daysRemaining !== null && agent.daysRemaining <= 0)
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
  const followUpAgents = activeAgents.filter((agent) => agent.relationship_status === "Needs Follow Up" || agent.relationship_status === "New Prospect");
  const warmAgents = activeAgents.filter((agent) => agent.relationship_status === "Warm Relationship");
  const partnerAgents = activeAgents.filter((agent) => agent.relationship_status === "Active Referral Partner" || agent.relationship_status === "VIP Referral Partner" || agent.is_active_referral_partner);

  const directoryAgents = useMemo(() => {
    let list = [...enrichedAgents];
    const term = search.trim().toLowerCase();

    if (statusFilter === "All Active") {
      list = list.filter((agent) => (agent.relationship_status || "") !== "Do Not Pursue");
    } else if (statusFilter === "Due Now") {
      list = list.filter((agent) => (agent.relationship_status || "") !== "Do Not Pursue" && agent.daysRemaining !== null && agent.daysRemaining <= 0);
    } else if (statusFilter === "15 Day Due") {
      list = list.filter((agent) =>
        (agent.relationship_status === "Needs Follow Up" || agent.relationship_status === "New Prospect") &&
        agent.daysRemaining !== null &&
        agent.daysRemaining <= 0
      );
    } else if (statusFilter === "30 Day Due") {
      list = list.filter((agent) =>
        agent.relationship_status === "Warm Relationship" &&
        agent.daysRemaining !== null &&
        agent.daysRemaining <= 0
      );
    } else if (statusFilter !== "All") {
      list = list.filter((agent) => (agent.relationship_status || "") === statusFilter);
    }

    if (term) {
      list = list.filter((agent) => {
        const text = [agent.name, agent.agency_name, agent.agent_phone, agent.agent_email, agent.city, agent.tags, agent.notes, agent.favorite_food]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(term);
      });
    }

    if (sortBy === "Most Overdue") list.sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
    if (sortBy === "Highest Score") list.sort((a, b) => b.score - a.score);
    if (sortBy === "Lowest Score") list.sort((a, b) => a.score - b.score);
    if (sortBy === "Name A-Z") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "Recently Contacted") list.sort((a, b) => String(b.last_contact_date || "").localeCompare(String(a.last_contact_date || "")));

    return list;
  }, [enrichedAgents, search, statusFilter, sortBy]);

  return (
    <div className="appShell">
      <style>{styles}</style>

      <main className="screen">
        <Header activeTab={activeTab} onRefresh={loadDashboard} />
        {message && <div className="message">{message}</div>}
        {loading && <div className="loadingCard">Loading Avalanche CRM...</div>}

        {!loading && activeTab === "mission" && (
          <MissionScreen
            missionAgents={missionAgents}
            followUpAgents={followUpAgents}
            warmAgents={warmAgents}
            partnerAgents={partnerAgents}
            openQuickAction={openQuickAction}
            openAgent={setSelectedAgent}
            openFilteredAgents={openFilteredAgents}
          />
        )}

        {!loading && activeTab === "agents" && (
          <AgentsScreen
            title={directoryTitle}
            agents={directoryAgents}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            setDirectoryTitle={setDirectoryTitle}
            openAgent={setSelectedAgent}
            openQuickAction={openQuickAction}
            emailLink={emailLink}
          />
        )}

        {!loading && activeTab === "add" && (
          <AddAgentScreen
            agentForm={agentForm}
            setAgentForm={setAgentForm}
            saveAgent={saveAgent}
            saving={saving}
            calculateNextFollowUp={calculateNextFollowUp}
            todayDateString={todayDateString}
          />
        )}

        {!loading && activeTab === "partners" && (
          <PartnersScreen
            agents={partnerAgents}
            openAgent={setSelectedAgent}
            openQuickAction={openQuickAction}
            emailLink={emailLink}
          />
        )}

        {!loading && activeTab === "playbook" && <PlaybookScreen />}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {selectedAgent && (
        <AgentProfile
          agent={selectedAgent}
          engagements={engagements[selectedAgent.id] || []}
          close={() => setSelectedAgent(null)}
          openQuickAction={openQuickAction}
          updateStatus={updateStatus}
          archiveAgent={archiveAgent}
          deleteAgent={deleteAgent}
          emailLink={emailLink}
        />
      )}

      {quickActionAgent && (
        <EngagementModal
          agent={quickActionAgent}
          actionType={quickActionType}
          form={engagementForm}
          setForm={setEngagementForm}
          saving={saving}
          saveEngagement={saveEngagement}
          close={() => setQuickActionAgent(null)}
        />
      )}
    </div>
  );
}

function Header({ activeTab, onRefresh }) {
  const titles = {
    mission: "Today's Mission",
    agents: "Agent Directory",
    add: "Add Agent",
    partners: "Referral Partners",
    playbook: "Playbook"
  };

  return (
    <div className="topHeader">
      <div>
        <div className="eyebrow">Avalanche CRM</div>
        <h1>{titles[activeTab]}</h1>
      </div>
      <button className="ghostButton" onClick={onRefresh}>Refresh</button>
    </div>
  );
}

function MissionScreen({ missionAgents, followUpAgents, warmAgents, partnerAgents, openQuickAction, openAgent, openFilteredAgents }) {
  const fifteenDayDue = followUpAgents.filter((agent) => agent.daysRemaining !== null && agent.daysRemaining <= 0);
  const thirtyDayDue = warmAgents.filter((agent) => agent.daysRemaining !== null && agent.daysRemaining <= 0);

  return (
    <div className="stack">
      <div className="metricGrid">
        <button className="metric metricButton dangerMetric" onClick={() => openFilteredAgents("Due Now", "All Follow-Ups Due Now")}>
          <span>Due Today</span>
          <strong>{missionAgents.length}</strong>
        </button>
        <button className="metric metricButton" onClick={() => openFilteredAgents("15 Day Due", "15-Day Follow-Ups Due") }>
          <span>15-Day Due</span>
          <strong>{fifteenDayDue.length}</strong>
        </button>
        <button className="metric metricButton" onClick={() => openFilteredAgents("30 Day Due", "30-Day Warm Touches Due") }>
          <span>30-Day Due</span>
          <strong>{thirtyDayDue.length}</strong>
        </button>
        <button className="metric metricButton" onClick={() => openFilteredAgents("Active Referral Partner", "Active Referral Partners") }>
          <span>Partners</span>
          <strong>{partnerAgents.length}</strong>
        </button>
      </div>

      <Section title="Priority Calls" subtitle="Tap a tile above to open the full filtered list.">
        {missionAgents.length === 0 ? (
          <EmptyState text="No overdue follow-ups. The machine is clean right now." />
        ) : (
          missionAgents.slice(0, 12).map((agent) => (
            <AgentRow key={agent.id} agent={agent} openAgent={openAgent} openQuickAction={openQuickAction} emailLink={emailLink} priority />
          ))
        )}
      </Section>

      <Section title="Warm Relationship Watch" subtitle="30-day keep-warm cycle.">
        {warmAgents.length === 0 ? <EmptyState text="No warm relationships yet." /> : warmAgents.slice(0, 6).map((agent) => <AgentRow key={agent.id} agent={agent} openAgent={openAgent} openQuickAction={openQuickAction} emailLink={emailLink} />)}
      </Section>
    </div>
  );
}

function AgentsScreen({ title, agents, search, setSearch, statusFilter, setStatusFilter, sortBy, setSortBy, setDirectoryTitle, openAgent, openQuickAction, emailLink }) {
  return (
    <div className="stack">
      <div className="filterCard">
        <input className="searchInput" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, agency, city, notes, tags..." />
        <div className="filterRow">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setDirectoryTitle("Agent Directory"); }}>
            <option>All</option>
            <option>All Active</option>
            <option>Due Now</option>
            <option>15 Day Due</option>
            <option>30 Day Due</option>
            {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <Section title={`${title || "Agent Directory"} (${agents.length})`} subtitle="Showing saved agents from Supabase. Clear search and set filter to All if something is missing.">
        {agents.length === 0 ? <EmptyState text="No agents found." /> : agents.map((agent) => <AgentRow key={agent.id} agent={agent} openAgent={openAgent} openQuickAction={openQuickAction} emailLink={emailLink} />)}
      </Section>
    </div>
  );
}

function AddAgentScreen({ agentForm, setAgentForm, saveAgent, saving, calculateNextFollowUp, todayDateString }) {
  return (
    <form className="formCard" onSubmit={saveAgent}>
      <Input label="Agency Name" value={agentForm.agency_name} onChange={(value) => setAgentForm({ ...agentForm, agency_name: value })} required />
      <div className="twoCol">
        <Input label="First Name" value={agentForm.agent_first_name} onChange={(value) => setAgentForm({ ...agentForm, agent_first_name: value })} />
        <Input label="Last Name" value={agentForm.agent_last_name} onChange={(value) => setAgentForm({ ...agentForm, agent_last_name: value })} />
      </div>
      <Input label="Cell / Phone" value={agentForm.agent_phone} onChange={(value) => setAgentForm({ ...agentForm, agent_phone: value })} />
      <Input label="Email" value={agentForm.agent_email} onChange={(value) => setAgentForm({ ...agentForm, agent_email: value })} />
      <Input label="Address" value={agentForm.address} onChange={(value) => setAgentForm({ ...agentForm, address: value })} />
      <div className="twoCol">
        <Input label="City" value={agentForm.city} onChange={(value) => setAgentForm({ ...agentForm, city: value })} />
        <Input label="State" value={agentForm.state} onChange={(value) => setAgentForm({ ...agentForm, state: value })} />
      </div>
      <Select
        label="Status"
        value={agentForm.relationship_status}
        options={STATUS_OPTIONS}
        onChange={(value) => setAgentForm({ ...agentForm, relationship_status: value, next_follow_up_date: calculateNextFollowUp(value, agentForm.last_contact_date || todayDateString()) || "" })}
      />
      <div className="twoCol">
        <Input label="Last Contact" type="date" value={agentForm.last_contact_date} onChange={(value) => setAgentForm({ ...agentForm, last_contact_date: value, next_follow_up_date: calculateNextFollowUp(agentForm.relationship_status, value) || "" })} />
        <Input label="Next Follow Up" type="date" value={agentForm.next_follow_up_date} onChange={(value) => setAgentForm({ ...agentForm, next_follow_up_date: value })} />
      </div>
      <Input label="Favorite Food / Drink" value={agentForm.favorite_food} onChange={(value) => setAgentForm({ ...agentForm, favorite_food: value })} placeholder="Tacos, coffee, Diet Coke..." />
      <Input label="Birthday" value={agentForm.birthday} onChange={(value) => setAgentForm({ ...agentForm, birthday: value })} />
      <Input label="Tags" value={agentForm.tags} onChange={(value) => setAgentForm({ ...agentForm, tags: value })} placeholder="Responds to text, gatekeeper matters" />
      <Textarea label="Memory Notes" value={agentForm.notes} onChange={(value) => setAgentForm({ ...agentForm, notes: value })} placeholder="Personal details, preferences, relationship context." />
      <button className="primaryButton" disabled={saving}>{saving ? "Saving..." : "Save Agent"}</button>
    </form>
  );
}

function PartnersScreen({ agents, openAgent, openQuickAction, emailLink }) {
  return (
    <div className="stack">
      <Section title="Active Referral Partners" subtitle="These relationships should never be allowed to go cold.">
        {agents.length === 0 ? <EmptyState text="No referral partners yet." /> : agents.map((agent) => <AgentRow key={agent.id} agent={agent} openAgent={openAgent} openQuickAction={openQuickAction} emailLink={emailLink} />)}
      </Section>
    </div>
  );
}

function PlaybookScreen() {
  return (
    <div className="stack">
      <Play title="New Prospect" text="Do not ask for business too soon. Make the first touch about usefulness, speed, and professionalism." />
      <Play title="Needs Follow Up" text="15-day cadence. Call or stop in. Learn one useful detail and log it." />
      <Play title="Office Stop In" text="Best for relationship building. Coffee, tacos, marketing drop, or meeting new staff should be logged as an action." />
      <Play title="Warm Relationship" text="30-day cadence. Keep familiarity alive. You are training them to remember your name when a claim call happens." />
      <Play title="Referral Partner" text="Protect the relationship. Thank them quickly, follow up professionally, and eventually sync the lead into JobNimbus." />
    </div>
  );
}

function AgentRow({ agent, openAgent, openQuickAction, emailLink, priority }) {
  const overdue = agent.daysRemaining !== null && agent.daysRemaining < 0;
  const dueToday = agent.daysRemaining === 0;
  const daysLabel = agent.daysRemaining === null ? "No cycle" : agent.daysRemaining < 0 ? `${Math.abs(agent.daysRemaining)} days overdue` : agent.daysRemaining === 0 ? "Due today" : `${agent.daysRemaining} days left`;

  return (
    <div className={`agentRow ${overdue || dueToday || priority ? "urgentRow" : ""}`}>
      <div className="agentMain" onClick={() => openAgent(agent)}>
        <div className="rowTop">
          <strong>{agent.name}</strong>
          <span className="scorePill">{agent.score}</span>
        </div>
        <div className="muted">{agent.agency_name}</div>
        <div className={overdue || dueToday ? "dangerText" : "muted"}>{daysLabel} · {agent.relationship_status || "No status"}</div>
      </div>
      <div className="rowActions">
        <button onClick={() => openQuickAction(agent, "Phone Call")}>Call</button>
        {agent.agent_email && <a className="rowEmailButton" href={emailLink(agent)}>Email</a>}
        <button onClick={() => openQuickAction(agent, "Office Stop In")}>Stop In</button>
      </div>
    </div>
  );
}

function AgentProfile({ agent, engagements, close, openQuickAction, updateStatus, archiveAgent, deleteAgent, emailLink }) {
  const tags = parseTagsSafe(agent.tags);
  const address = [agent.address, agent.city, agent.state].filter(Boolean).join(", ");

  return (
    <div className="modalOverlay">
      <div className="profileSheet">
        <div className="sheetHeader">
          <button onClick={close}>Close</button>
          <strong>Agent Profile</strong>
          <span />
        </div>

        <div className="profileHero">
          <div className="avatar">{agent.name.slice(0, 1).toUpperCase()}</div>
          <h2>{agent.name}</h2>
          <p>{agent.agency_name}</p>
          <div className="profileStats">
            <Metric label="Score" value={agent.score} />
            <Metric label="Referrals" value={agent.referral_count || 0} />
            <Metric label="Days" value={agent.daysRemaining === null ? "-" : agent.daysRemaining < 0 ? `${Math.abs(agent.daysRemaining)} late` : agent.daysRemaining} />
          </div>
        </div>

        <div className="quickGrid">
          {agent.agent_phone && <a href={`tel:${agent.agent_phone}`}>Call</a>}
          {agent.agent_phone && <a href={`sms:${agent.agent_phone}`}>Text</a>}
          {agent.agent_email && <a href={emailLink(agent)}>Email</a>}
          {address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Map</a>}
        </div>

        <div className="quickGrid">
          <button onClick={() => openQuickAction(agent, "Phone Call")}>Log Call</button>
          <button onClick={() => openQuickAction(agent, "Office Stop In")}>Log Stop In</button>
          <button onClick={() => openQuickAction(agent, "Referral Request")}>Referral Ask</button>
          <button onClick={() => openQuickAction(agent, "Referral Received")}>Referral Won</button>
        </div>

        <div className="card">
          <label>Status</label>
          <select value={agent.relationship_status || "New Prospect"} onChange={(e) => updateStatus(agent, e.target.value)}>
            {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>

        <div className="card">
          <h3>Memory</h3>
          <p>{agent.notes || "No memory notes yet."}</p>
          {agent.favorite_food && <p><strong>Food/Drink:</strong> {agent.favorite_food}</p>}
          {agent.birthday && <p><strong>Birthday:</strong> {agent.birthday}</p>}
          {tags.length > 0 && <div className="tagWrap">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        </div>

        <div className="card">
          <h3>Engagement Timeline</h3>
          {engagements.length === 0 ? <p>No history yet.</p> : engagements.map((item) => (
            <div className="timelineItem" key={item.id}>
              <div className="timelineTop"><strong>{item.engagement_type}</strong><span>{item.engagement_date}</span></div>
              {item.action_taken && <p><strong>Action:</strong> {item.action_taken}</p>}
              {item.notes && <p>{item.notes}</p>}
              {item.outcome && <p><strong>Outcome:</strong> {item.outcome}</p>}
              {item.next_action && <p><strong>Next:</strong> {item.next_action}</p>}
            </div>
          ))}
        </div>

        <div className="dangerZone">
          <button onClick={() => archiveAgent(agent)}>Move to Do Not Pursue</button>
          <button onClick={() => deleteAgent(agent)}>Delete Permanently</button>
        </div>
      </div>
    </div>
  );
}

function EngagementModal({ agent, actionType, form, setForm, saving, saveEngagement, close }) {
  return (
    <div className="modalOverlay">
      <form className="actionSheet" onSubmit={saveEngagement}>
        <div className="sheetHeader">
          <button type="button" onClick={close}>Cancel</button>
          <strong>{actionType}</strong>
          <span />
        </div>
        <p className="modalSub">{displayAgentName(agent)} · {agent.agency_name}</p>

        {actionType === "Office Stop In" && (
          <Select label="Action Taken" value={form.action_taken} options={OFFICE_ACTIONS} onChange={(value) => setForm({ ...form, action_taken: value })} />
        )}

        {actionType !== "Office Stop In" && actionType !== "Phone Call" && (
          <Input label="Action Taken" value={form.action_taken} onChange={(value) => setForm({ ...form, action_taken: value })} placeholder="Short label" />
        )}

        <Textarea label="Engagement Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} placeholder="What happened? Who was there? What did you learn?" required />
        <Textarea label="Outcome" value={form.outcome} onChange={(value) => setForm({ ...form, outcome: value })} placeholder="Warmer, neutral, needs another touch, etc." />
        <Input label="Next Action" value={form.next_action} onChange={(value) => setForm({ ...form, next_action: value })} placeholder="Stop by next month with coffee" />
        <button className="primaryButton" disabled={saving}>{saving ? "Saving..." : "Save Engagement"}</button>
      </form>
    </div>
  );
}

function displayAgentName(agent) {
  return [agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name || "Unnamed Agent";
}

function Section({ title, subtitle, children }) {
  return (
    <section className="sectionCard">
      <div className="sectionHead"><h2>{title}</h2><p>{subtitle}</p></div>
      <div className="sectionBody">{children}</div>
    </section>
  );
}

function Metric({ label, value, danger }) {
  return (
    <div className={`metric ${danger ? "dangerMetric" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="emptyState">{text}</div>;
}

function Play({ title, text }) {
  return <div className="play"><h3>{title}</h3><p>{text}</p></div>;
}

function Input({ label, value, onChange, required = false, type = "text", placeholder = "" }) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </label>
  );
}

function Textarea({ label, value, onChange, required = false, placeholder = "" }) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function BottomNav({ activeTab, setActiveTab }) {
  const items = [
    ["mission", "Mission"],
    ["agents", "Agents"],
    ["add", "Add"],
    ["partners", "Partners"],
    ["playbook", "Playbook"]
  ];

  return (
    <nav className="bottomNav">
      {items.map(([key, label]) => (
        <button key={key} onClick={() => setActiveTab(key)} className={activeTab === key ? "active" : ""}>{label}</button>
      ))}
    </nav>
  );
}

function parseTagsSafe(tags) {
  if (!tags) return [];
  return String(tags).split(",").map((tag) => tag.trim()).filter(Boolean);
}

const styles = `
* { box-sizing: border-box; }
body { margin: 0; background: #050816; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
button, input, textarea, select { font: inherit; }
.appShell { min-height: 100vh; background: radial-gradient(circle at top, #1e293b 0, #050816 45%, #020617 100%); }
.screen { max-width: 980px; margin: 0 auto; padding: 14px 14px 96px; }
.topHeader { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(18px); background: rgba(15, 23, 42, 0.86); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 0 0 26px 26px; padding: 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.28); }
.eyebrow { color: #94a3b8; text-transform: uppercase; letter-spacing: .12em; font-size: 12px; font-weight: 700; }
h1 { margin: 2px 0 0; font-size: 28px; line-height: 1.05; }
h2, h3, p { margin-top: 0; }
.ghostButton { background: rgba(255,255,255,.08); color: #f8fafc; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 10px 12px; }
.message, .loadingCard { margin-top: 14px; background: rgba(15, 23, 42, .92); border: 1px solid rgba(148, 163, 184, .2); border-radius: 18px; padding: 14px; color: #cbd5e1; }
.stack { display: flex; flex-direction: column; gap: 14px; margin-top: 14px; }
.metricGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.metric { background: rgba(15, 23, 42, .88); border: 1px solid rgba(148, 163, 184, .18); border-radius: 20px; padding: 14px; min-height: 80px; text-align: left; }
.metricButton { cursor: pointer; color: #f8fafc; transition: transform .12s ease, border-color .12s ease; }
.metricButton:active { transform: scale(.98); }
.metricButton:hover { border-color: rgba(255,255,255,.35); }
.metric span { display: block; color: #94a3b8; font-size: 12px; margin-bottom: 8px; }
.metric strong { font-size: 28px; }
.dangerMetric { background: rgba(127, 29, 29, .32); border-color: rgba(248, 113, 113, .35); }
.sectionCard, .formCard, .filterCard, .card, .play { background: rgba(15, 23, 42, .9); border: 1px solid rgba(148, 163, 184, .16); border-radius: 24px; padding: 16px; box-shadow: 0 18px 50px rgba(0,0,0,.22); }
.sectionHead h2 { margin: 0; font-size: 22px; }
.sectionHead p { margin: 4px 0 12px; color: #94a3b8; font-size: 14px; }
.sectionBody { display: flex; flex-direction: column; gap: 10px; }
.emptyState { background: rgba(2, 6, 23, .55); border-radius: 18px; padding: 16px; color: #cbd5e1; }
.agentRow { background: rgba(30, 41, 59, .92); border: 1px solid rgba(148, 163, 184, .14); border-radius: 20px; padding: 13px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.urgentRow { background: rgba(127, 29, 29, .26); border-color: rgba(248, 113, 113, .35); }
.agentMain { flex: 1; cursor: pointer; min-width: 0; }
.rowTop { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.rowTop strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scorePill { background: #f8fafc; color: #020617; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 800; }
.muted { color: #94a3b8; font-size: 13px; margin-top: 3px; }
.dangerText { color: #fca5a5; font-size: 13px; margin-top: 3px; font-weight: 700; }
.rowActions { display: flex; gap: 7px; }
.rowActions button, .rowActions a, .quickGrid button, .quickGrid a { background: #f8fafc; color: #020617; border: none; border-radius: 14px; padding: 10px 12px; font-weight: 800; text-decoration: none; text-align: center; }
.rowEmailButton { display: inline-flex; align-items: center; justify-content: center; }
.filterCard { display: flex; flex-direction: column; gap: 10px; }
.searchInput, input, textarea, select { width: 100%; background: rgba(2, 6, 23, .8); color: #f8fafc; border: 1px solid rgba(148, 163, 184, .25); border-radius: 15px; padding: 12px; outline: none; }
textarea { min-height: 96px; resize: vertical; }
.filterRow, .twoCol { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.formCard { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; color: #cbd5e1; font-size: 13px; font-weight: 700; }
.primaryButton { width: 100%; border: none; border-radius: 18px; padding: 15px; background: #f8fafc; color: #020617; font-weight: 900; font-size: 16px; }
.bottomNav { position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%); width: min(96vw, 720px); background: rgba(15, 23, 42, .94); border: 1px solid rgba(148, 163, 184, .2); border-radius: 26px; padding: 8px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; z-index: 30; box-shadow: 0 22px 70px rgba(0,0,0,.45); backdrop-filter: blur(18px); }
.bottomNav button { border: none; background: transparent; color: #94a3b8; border-radius: 18px; padding: 11px 4px; font-size: 12px; font-weight: 800; }
.bottomNav button.active { background: #f8fafc; color: #020617; }
.modalOverlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.72); display: flex; justify-content: center; align-items: flex-end; padding: 12px; }
.profileSheet, .actionSheet { width: min(100%, 760px); max-height: 92vh; overflow-y: auto; background: #0f172a; border: 1px solid rgba(148, 163, 184, .22); border-radius: 30px 30px 18px 18px; padding: 16px; box-shadow: 0 -22px 80px rgba(0,0,0,.55); }
.sheetHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.sheetHeader button { background: rgba(255,255,255,.08); color: #f8fafc; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 8px 10px; }
.profileHero { text-align: center; background: rgba(30, 41, 59, .7); border-radius: 24px; padding: 18px; margin-bottom: 12px; }
.avatar { width: 64px; height: 64px; border-radius: 22px; background: #f8fafc; color: #020617; display: grid; place-items: center; font-size: 28px; font-weight: 900; margin: 0 auto 10px; }
.profileHero h2 { margin: 0; font-size: 28px; }
.profileHero p { color: #94a3b8; margin: 4px 0 0; }
.profileStats, .quickGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
.tagWrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.tagWrap span { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); border-radius: 999px; padding: 6px 10px; font-size: 12px; }
.timelineItem { border-top: 1px solid rgba(148, 163, 184, .16); padding: 12px 0; }
.timelineTop { display: flex; justify-content: space-between; gap: 8px; color: #f8fafc; }
.timelineTop span { color: #94a3b8; font-size: 13px; }
.dangerZone { display: flex; gap: 10px; margin: 16px 0 6px; }
.dangerZone button { border: 1px solid rgba(248, 113, 113, .35); color: #fca5a5; background: rgba(127, 29, 29, .18); border-radius: 14px; padding: 10px; }
.modalSub { color: #94a3b8; margin-bottom: 14px; }
.play h3 { margin-bottom: 6px; }
.play p { color: #cbd5e1; margin-bottom: 0; }
@media (max-width: 640px) {
  .screen { padding: 10px 10px 98px; }
  .topHeader { border-radius: 0 0 22px 22px; padding: 15px; }
  h1 { font-size: 24px; }
  .metricGrid { grid-template-columns: repeat(2, 1fr); }
  .agentRow { align-items: stretch; flex-direction: column; }
  .rowActions { display: grid; grid-template-columns: 1fr 1fr; }
  .profileStats, .quickGrid { grid-template-columns: repeat(2, 1fr); }
  .filterRow, .twoCol { grid-template-columns: 1fr; }
  .bottomNav { bottom: 8px; }
  .bottomNav button { font-size: 11px; padding: 10px 2px; }
}
`;
