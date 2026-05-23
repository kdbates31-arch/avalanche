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

export default function App() {
  const emptyAgentForm = {
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

  const [agents, setAgents] = useState([]);
  const [engagements, setEngagements] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [quickActionAgent, setQuickActionAgent] = useState(null);
  const [quickActionType, setQuickActionType] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Active");
  const [sortBy, setSortBy] = useState("Most Overdue");
  const [engagementForm, setEngagementForm] = useState({
    engagement_type: "Phone Call",
    action_taken: "",
    notes: "",
    outcome: "",
    next_action: ""
  });

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
    if (status === "Needs Follow Up") return 15;
    if (status === "Warm Relationship") return 30;
    if (status === "Active Referral Partner") return 21;
    if (status === "VIP Referral Partner") return 14;
    if (status === "New Prospect") return 15;
    return null;
  }

  function calculateNextFollowUp(status, lastContactDate) {
    const days = getFollowUpDays(status);
    if (!days) return "";
    const baseDate = lastContactDate || todayDateString();
    return addDays(baseDate, days);
  }

  function daysUntil(dateString) {
    if (!dateString) return null;
    const today = new Date(todayDateString() + "T00:00:00");
    const target = new Date(dateString + "T00:00:00");
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  }

  function isDue(agent) {
    const remaining = daysUntil(agent.next_follow_up_date);
    return remaining !== null && remaining <= 0;
  }

  function displayName(agent) {
    return [agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name || "Unnamed Agent";
  }

  function parseTags(tags) {
    if (!tags) return [];
    return String(tags).split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  function calculateRelationshipScore(agent, agentEngagements = []) {
    let score = 40;
    const remaining = daysUntil(agent.next_follow_up_date);

    if (agent.relationship_status === "New Prospect") score += 0;
    if (agent.relationship_status === "Needs Follow Up") score += 5;
    if (agent.relationship_status === "Warm Relationship") score += 15;
    if (agent.relationship_status === "Active Referral Partner") score += 25;
    if (agent.relationship_status === "VIP Referral Partner") score += 35;
    if (agent.relationship_status === "Cold") score -= 15;
    if (agent.relationship_status === "Do Not Pursue") score = 0;

    if (remaining !== null && remaining < 0) score -= Math.min(35, Math.abs(remaining));
    if (remaining !== null && remaining >= 0 && remaining <= 7) score += 5;

    score += Math.min(20, agentEngagements.length * 4);
    score += Math.min(25, (agent.referral_count || 0) * 10);

    if (agent.last_contact_date) {
      const today = new Date(todayDateString() + "T00:00:00");
      const last = new Date(agent.last_contact_date + "T00:00:00");
      const daysSinceContact = Math.ceil((today - last) / (1000 * 60 * 60 * 24));
      if (daysSinceContact <= 7) score += 10;
      if (daysSinceContact > 45) score -= 15;
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
      setMessage("Error loading agents: " + agentError.message);
      setLoading(false);
      return;
    }

    const { data: engagementData, error: engagementError } = await supabase
      .from("engagements")
      .select("*")
      .order("engagement_date", { ascending: false });

    if (engagementError) {
      setMessage("Error loading engagements: " + engagementError.message);
    }

    const grouped = {};
    (engagementData || []).forEach((engagement) => {
      if (!grouped[engagement.agency_id]) grouped[engagement.agency_id] = [];
      grouped[engagement.agency_id].push(engagement);
    });

    setAgents(agentData || []);
    setEngagements(grouped);
    setLoading(false);
  }

  async function addAgent(e) {
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

    const lastDate = agentForm.last_contact_date || todayDateString();
    const nextDate = agentForm.next_follow_up_date || calculateNextFollowUp(agentForm.relationship_status, lastDate);

    const payload = {
      ...agentForm,
      last_contact_date: agentForm.last_contact_date || null,
      next_follow_up_date: nextDate || null,
      is_active_referral_partner:
        agentForm.relationship_status === "Active Referral Partner" ||
        agentForm.relationship_status === "VIP Referral Partner"
    };

    const { error } = await supabase.from("agencies").insert([payload]);

    if (error) {
      setMessage("Error saving agent: " + error.message);
    } else {
      setMessage("Agent saved successfully.");
      setAgentForm(emptyAgentForm);
      setShowAddAgent(false);
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
    if (!quickActionAgent) return;

    if (!engagementForm.notes.trim()) {
      setMessage("Engagement notes are required. Future you will thank current you.");
      return;
    }

    setSaving(true);
    setMessage("");

    const today = todayDateString();
    const nextDate = calculateNextFollowUp(quickActionAgent.relationship_status, today);

    const payload = {
      agency_id: quickActionAgent.id,
      engagement_type: engagementForm.engagement_type,
      engagement_date: today,
      action_taken: engagementForm.action_taken,
      notes: engagementForm.notes,
      outcome: engagementForm.outcome,
      next_action: engagementForm.next_action
    };

    const { error: engagementError } = await supabase.from("engagements").insert([payload]);

    if (engagementError) {
      setMessage("Error saving engagement: " + engagementError.message);
      setSaving(false);
      return;
    }

    const updates = {
      last_contact_date: today,
      next_follow_up_date: nextDate || null,
      last_engagement_type: engagementForm.engagement_type,
      engagement_count: (quickActionAgent.engagement_count || 0) + 1
    };

    if (engagementForm.engagement_type === "Referral Received") {
      updates.referral_count = (quickActionAgent.referral_count || 0) + 1;
      updates.last_referral_date = today;
      updates.relationship_status = "Active Referral Partner";
      updates.is_active_referral_partner = true;
      updates.next_follow_up_date = calculateNextFollowUp("Active Referral Partner", today);
    }

    const { error: agentError } = await supabase
      .from("agencies")
      .update(updates)
      .eq("id", quickActionAgent.id);

    if (agentError) {
      setMessage("Engagement saved, but agent update failed: " + agentError.message);
    } else {
      setMessage("Engagement logged successfully.");
    }

    setQuickActionAgent(null);
    setQuickActionType("");
    setSaving(false);
    await loadDashboard();
  }

  async function updateStatus(agent, newStatus) {
    const baseDate = agent.last_contact_date || todayDateString();
    const nextDate = calculateNextFollowUp(newStatus, baseDate);

    const { error } = await supabase
      .from("agencies")
      .update({
        relationship_status: newStatus,
        is_active_referral_partner:
          newStatus === "Active Referral Partner" || newStatus === "VIP Referral Partner",
        next_follow_up_date: nextDate || null
      })
      .eq("id", agent.id);

    if (error) {
      setMessage("Error updating status: " + error.message);
    } else {
      setMessage("Status updated.");
      await loadDashboard();
    }
  }

  async function moveToDoNotPursue(agent) {
    const confirmMove = window.confirm("Move this agent to Do Not Pursue? They will leave your active dashboard but remain stored.");
    if (!confirmMove) return;

    const { error } = await supabase
      .from("agencies")
      .update({ relationship_status: "Do Not Pursue", next_follow_up_date: null })
      .eq("id", agent.id);

    if (error) setMessage("Error moving agent: " + error.message);
    else {
      setMessage("Agent moved to Do Not Pursue.");
      await loadDashboard();
    }
  }

  async function deleteAgent(agent) {
    const confirmDelete = window.confirm("Delete this agent permanently? This removes their history too.");
    if (!confirmDelete) return;

    const { error } = await supabase.from("agencies").delete().eq("id", agent.id);

    if (error) setMessage("Error deleting agent: " + error.message);
    else {
      setMessage("Agent deleted.");
      await loadDashboard();
    }
  }

  const enrichedAgents = useMemo(() => {
    return agents.map((agent) => {
      const agentEngagements = engagements[agent.id] || [];
      return {
        ...agent,
        score: calculateRelationshipScore(agent, agentEngagements),
        agentEngagements,
        daysRemaining: daysUntil(agent.next_follow_up_date)
      };
    });
  }, [agents, engagements]);

  const activeAgents = enrichedAgents.filter((agent) => agent.relationship_status !== "Do Not Pursue");

  const missionAgents = activeAgents
    .filter((agent) => isDue(agent))
    .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));

  const needsFollowUp = activeAgents.filter((agent) => agent.relationship_status === "Needs Follow Up");
  const warmAgents = activeAgents.filter((agent) => agent.relationship_status === "Warm Relationship");
  const referralPartners = activeAgents.filter(
    (agent) =>
      agent.relationship_status === "Active Referral Partner" ||
      agent.relationship_status === "VIP Referral Partner" ||
      agent.is_active_referral_partner
  );

  const directoryAgents = useMemo(() => {
    let results = [...enrichedAgents];
    const term = search.toLowerCase().trim();

    if (statusFilter === "All Active") {
      results = results.filter((agent) => agent.relationship_status !== "Do Not Pursue");
    } else if (statusFilter !== "All") {
      results = results.filter((agent) => agent.relationship_status === statusFilter);
    }

    if (term) {
      results = results.filter((agent) => {
        const haystack = [
          displayName(agent),
          agent.agency_name,
          agent.agent_phone,
          agent.agent_email,
          agent.city,
          agent.tags,
          agent.notes,
          agent.favorite_food
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    if (sortBy === "Most Overdue") {
      results.sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
    }
    if (sortBy === "Highest Score") {
      results.sort((a, b) => b.score - a.score);
    }
    if (sortBy === "Lowest Score") {
      results.sort((a, b) => a.score - b.score);
    }
    if (sortBy === "Name A-Z") {
      results.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    }
    if (sortBy === "Recently Contacted") {
      results.sort((a, b) => String(b.last_contact_date || "").localeCompare(String(a.last_contact_date || "")));
    }

    return results;
  }, [enrichedAgents, search, statusFilter, sortBy]);

  const topPriorityAgents = missionAgents.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl sticky top-2 z-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-400">Roofing Relationship OS</p>
              <h1 className="text-3xl md:text-5xl font-bold mt-1">Avalanche CRM</h1>
              <p className="text-slate-400 mt-2 max-w-3xl">
                Open the app, see who matters today, log the engagement, keep the relationship warm.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddAgent(true)} className="bg-white text-slate-950 px-4 py-3 rounded-2xl font-bold">
                Add Agent
              </button>
              <button onClick={loadDashboard} className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl font-bold">
                Refresh
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard label="Today's Mission" value={missionAgents.length} tone="urgent" />
          <MetricCard label="Needs Follow Up" value={needsFollowUp.length} />
          <MetricCard label="Warm" value={warmAgents.length} />
          <MetricCard label="Referral Partners" value={referralPartners.length} />
        </section>

        <section className="bg-red-950/40 border border-red-800 rounded-3xl p-5 shadow-xl">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Today's Mission</h2>
            <p className="text-red-200 text-sm">The people you should touch today, sorted by urgency.</p>
          </div>

          {loading ? (
            <p className="text-slate-300">Loading dashboard...</p>
          ) : topPriorityAgents.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl p-4 text-slate-300">
              No overdue follow-ups right now. That is the sound of a system actually working.
            </div>
          ) : (
            <div className="space-y-3">
              {topPriorityAgents.map((agent) => (
                <MissionRow key={agent.id} agent={agent} onQuickAction={openQuickAction} onSelect={setSelectedAgent} />
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <SmartPlaybook />
            <AgentSection title="Warm Relationships" subtitle="30-day keep-warm cycle" agents={warmAgents.slice(0, 6)} engagements={engagements} onQuickAction={openQuickAction} onStatusChange={updateStatus} onArchive={moveToDoNotPursue} onDelete={deleteAgent} onSelect={setSelectedAgent} />
          </div>

          <div className="xl:col-span-2 space-y-6">
            <AgentDirectory
              agents={directoryAgents}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onSelect={setSelectedAgent}
              onQuickAction={openQuickAction}
            />
            <AgentSection title="Active Referral Partners" subtitle="People who can turn relationship work into jobs" agents={referralPartners.slice(0, 6)} engagements={engagements} onQuickAction={openQuickAction} onStatusChange={updateStatus} onArchive={moveToDoNotPursue} onDelete={deleteAgent} onSelect={setSelectedAgent} />
          </div>
        </section>
      </div>

      {showAddAgent && (
        <Modal title="Add Insurance Agent" onClose={() => setShowAddAgent(false)}>
          <AgentForm agentForm={agentForm} setAgentForm={setAgentForm} addAgent={addAgent} saving={saving} calculateNextFollowUp={calculateNextFollowUp} todayDateString={todayDateString} />
        </Modal>
      )}

      {quickActionAgent && (
        <Modal title={`${quickActionType}: ${displayName(quickActionAgent)}`} onClose={() => setQuickActionAgent(null)}>
          <form onSubmit={saveEngagement} className="space-y-4">
            {quickActionType === "Office Stop In" && (
              <Select label="Action Taken" value={engagementForm.action_taken} options={OFFICE_ACTIONS} onChange={(value) => setEngagementForm({ ...engagementForm, action_taken: value })} />
            )}

            {quickActionType !== "Office Stop In" && quickActionType !== "Phone Call" && (
              <Input label="Action Taken" value={engagementForm.action_taken} onChange={(value) => setEngagementForm({ ...engagementForm, action_taken: value })} placeholder="Short label for what happened" />
            )}

            <Textarea label="Engagement Notes" value={engagementForm.notes} onChange={(value) => setEngagementForm({ ...engagementForm, notes: value })} placeholder="What happened? Who was there? What did you learn?" required />
            <Textarea label="Outcome" value={engagementForm.outcome} onChange={(value) => setEngagementForm({ ...engagementForm, outcome: value })} placeholder="Warmer? Neutral? Needs another touch?" />
            <Input label="Next Action" value={engagementForm.next_action} onChange={(value) => setEngagementForm({ ...engagementForm, next_action: value })} placeholder="Example: stop by next month with coffee" />

            <button disabled={saving} className="w-full bg-white text-slate-950 py-3 rounded-2xl font-bold disabled:opacity-50">
              {saving ? "Saving..." : "Save Engagement"}
            </button>
          </form>
        </Modal>
      )}

      {selectedAgent && (
        <AgentProfileModal
          agent={selectedAgent}
          engagements={engagements[selectedAgent.id] || []}
          onClose={() => setSelectedAgent(null)}
          onQuickAction={openQuickAction}
          onStatusChange={updateStatus}
          onArchive={moveToDoNotPursue}
          onDelete={deleteAgent}
        />
      )}
    </div>
  );
}

function AgentForm({ agentForm, setAgentForm, addAgent, saving, calculateNextFollowUp, todayDateString }) {
  return (
    <form onSubmit={addAgent} className="space-y-3">
      <Input label="Agency Name" value={agentForm.agency_name} onChange={(value) => setAgentForm({ ...agentForm, agency_name: value })} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" value={agentForm.agent_first_name} onChange={(value) => setAgentForm({ ...agentForm, agent_first_name: value })} />
        <Input label="Last Name" value={agentForm.agent_last_name} onChange={(value) => setAgentForm({ ...agentForm, agent_last_name: value })} />
      </div>
      <Input label="Cell / Phone" value={agentForm.agent_phone} onChange={(value) => setAgentForm({ ...agentForm, agent_phone: value })} />
      <Input label="Email" value={agentForm.agent_email} onChange={(value) => setAgentForm({ ...agentForm, agent_email: value })} />
      <Input label="Address" value={agentForm.address} onChange={(value) => setAgentForm({ ...agentForm, address: value })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City" value={agentForm.city} onChange={(value) => setAgentForm({ ...agentForm, city: value })} />
        <Input label="State" value={agentForm.state} onChange={(value) => setAgentForm({ ...agentForm, state: value })} />
      </div>
      <Select
        label="Relationship Status"
        value={agentForm.relationship_status}
        options={STATUS_OPTIONS}
        onChange={(value) =>
          setAgentForm({
            ...agentForm,
            relationship_status: value,
            next_follow_up_date: calculateNextFollowUp(value, agentForm.last_contact_date || todayDateString())
          })
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Last Contact" type="date" value={agentForm.last_contact_date} onChange={(value) => setAgentForm({ ...agentForm, last_contact_date: value, next_follow_up_date: calculateNextFollowUp(agentForm.relationship_status, value) })} />
        <Input label="Next Follow Up" type="date" value={agentForm.next_follow_up_date} onChange={(value) => setAgentForm({ ...agentForm, next_follow_up_date: value })} />
      </div>
      <Input label="Favorite Food / Drink" value={agentForm.favorite_food} onChange={(value) => setAgentForm({ ...agentForm, favorite_food: value })} />
      <Input label="Birthday" value={agentForm.birthday} onChange={(value) => setAgentForm({ ...agentForm, birthday: value })} />
      <Input label="Tags" value={agentForm.tags} onChange={(value) => setAgentForm({ ...agentForm, tags: value })} placeholder="Likes tacos, responds to text, gatekeeper matters" />
      <Textarea label="Memory Notes" value={agentForm.notes} onChange={(value) => setAgentForm({ ...agentForm, notes: value })} placeholder="Personal details, preferences, family, gatekeeper, relationship context." />
      <button disabled={saving} className="w-full bg-white text-slate-950 py-3 rounded-2xl font-bold disabled:opacity-50">
        {saving ? "Saving..." : "Save Agent"}
      </button>
    </form>
  );
}

function MissionRow({ agent, onQuickAction, onSelect }) {
  const overdueText = agent.daysRemaining < 0 ? `${Math.abs(agent.daysRemaining)} days overdue` : "Due today";
  return (
    <div className="bg-slate-900 border border-red-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div onClick={() => onSelect(agent)} className="cursor-pointer">
        <p className="text-xl font-bold">{[agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name}</p>
        <p className="text-slate-300">{agent.agency_name}</p>
        <p className="text-red-300 font-semibold">{overdueText}</p>
      </div>
      <div className="grid grid-cols-2 md:flex gap-2">
        <QuickButton label="Call" onClick={() => onQuickAction(agent, "Phone Call")} />
        <QuickButton label="Stop In" onClick={() => onQuickAction(agent, "Office Stop In")} />
        <QuickButton label="Referral Ask" onClick={() => onQuickAction(agent, "Referral Request")} />
        <QuickButton label="Open" onClick={() => onSelect(agent)} dark />
      </div>
    </div>
  );
}

function AgentDirectory({ agents, search, setSearch, statusFilter, setStatusFilter, sortBy, setSortBy, onSelect, onQuickAction }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Agent Directory</h2>
        <p className="text-slate-400 text-sm">Search, filter, then click one agent to see the full relationship history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, agency, tag, city, notes..."
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-slate-100 md:col-span-1"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-slate-100">
          <option>All Active</option>
          <option>All</option>
          {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-slate-100">
          {SORT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>

      <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
        {agents.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-4 text-slate-400">No agents match this search.</div>
        ) : (
          agents.map((agent) => (
            <DirectoryRow key={agent.id} agent={agent} onSelect={onSelect} onQuickAction={onQuickAction} />
          ))
        )}
      </div>
    </section>
  );
}

function DirectoryRow({ agent, onSelect, onQuickAction }) {
  const overdue = agent.daysRemaining !== null && agent.daysRemaining < 0;
  return (
    <div className={`rounded-2xl border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${overdue ? "bg-red-900/30 border-red-700" : "bg-slate-800 border-slate-700"}`}>
      <div onClick={() => onSelect(agent)} className="cursor-pointer flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-lg">{[agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name}</p>
          <span className="text-xs bg-slate-950 border border-slate-700 rounded-full px-2 py-1">{agent.relationship_status || "No Status"}</span>
          <span className="text-xs bg-slate-950 border border-slate-700 rounded-full px-2 py-1">Score {agent.score}</span>
        </div>
        <p className="text-slate-300 text-sm">{agent.agency_name}</p>
        <p className={`text-sm ${overdue ? "text-red-300" : "text-slate-400"}`}>
          {agent.daysRemaining === null ? "No follow-up cycle" : agent.daysRemaining < 0 ? `${Math.abs(agent.daysRemaining)} days overdue` : `${agent.daysRemaining} days until follow-up`}
          {agent.last_contact_date ? ` • Last: ${agent.last_contact_date}` : " • No last contact"}
        </p>
      </div>
      <div className="flex gap-2">
        <QuickButton label="Call" onClick={() => onQuickAction(agent, "Phone Call")} />
        <QuickButton label="Open" onClick={() => onSelect(agent)} dark />
      </div>
    </div>
  );
}

function AgentSection({ title, subtitle, agents, engagements, onQuickAction, onStatusChange, onArchive, onDelete, onSelect }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-slate-400 text-sm">{subtitle}</p>
      </div>
      {agents.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-4 text-slate-400">No agents in this section yet.</div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <MiniAgentCard key={agent.id} agent={agent} engagements={engagements[agent.id] || []} onQuickAction={onQuickAction} onStatusChange={onStatusChange} onArchive={onArchive} onDelete={onDelete} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}

function MiniAgentCard({ agent, onQuickAction, onStatusChange, onSelect }) {
  const overdue = agent.daysRemaining !== null && agent.daysRemaining < 0;
  return (
    <div className={`rounded-2xl border p-4 ${overdue ? "bg-red-900/30 border-red-700" : "bg-slate-800 border-slate-700"}`}>
      <div className="flex justify-between gap-3">
        <div onClick={() => onSelect(agent)} className="cursor-pointer">
          <p className="font-bold text-lg">{[agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name}</p>
          <p className="text-slate-300 text-sm">{agent.agency_name}</p>
          <p className={`text-sm ${overdue ? "text-red-300" : "text-slate-400"}`}>
            {agent.daysRemaining === null ? "No follow-up" : agent.daysRemaining < 0 ? `${Math.abs(agent.daysRemaining)} days overdue` : `${agent.daysRemaining} days left`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl">{agent.score}</p>
          <p className="text-xs text-slate-400">score</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <QuickButton label="Call" onClick={() => onQuickAction(agent, "Phone Call")} />
        <QuickButton label="Stop In" onClick={() => onQuickAction(agent, "Office Stop In")} />
      </div>
      <select value={agent.relationship_status || "New Prospect"} onChange={(e) => onStatusChange(agent, e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 mt-3 text-sm">
        {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
      </select>
    </div>
  );
}

function AgentProfileModal({ agent, engagements, onClose, onQuickAction, onStatusChange, onArchive, onDelete }) {
  const addressText = [agent.address, agent.city, agent.state].filter(Boolean).join(", ");
  const tags = parseTagsSafe(agent.tags);
  return (
    <Modal title={`${[agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-400">{agent.agency_name}</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Info label="Score" value={agent.score} />
            <Info label="Referrals" value={agent.referral_count || 0} />
            <Info label="Last Contact" value={agent.last_contact_date || "Not logged"} />
            <Info label="Next Follow Up" value={agent.next_follow_up_date || "Not set"} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {agent.agent_phone && <a className="bg-white text-slate-950 text-center rounded-xl px-3 py-2 font-bold" href={`tel:${agent.agent_phone}`}>Call</a>}
            {agent.agent_phone && <a className="bg-white text-slate-950 text-center rounded-xl px-3 py-2 font-bold" href={`sms:${agent.agent_phone}`}>Text</a>}
            {agent.agent_email && <a className="bg-white text-slate-950 text-center rounded-xl px-3 py-2 font-bold" href={`mailto:${agent.agent_email}`}>Email</a>}
            {addressText && <a className="bg-white text-slate-950 text-center rounded-xl px-3 py-2 font-bold" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`} target="_blank" rel="noreferrer">Map</a>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <QuickButton label="Phone Call" onClick={() => onQuickAction(agent, "Phone Call")} />
          <QuickButton label="Office Stop In" onClick={() => onQuickAction(agent, "Office Stop In")} />
          <QuickButton label="Referral Ask" onClick={() => onQuickAction(agent, "Referral Request")} />
          <QuickButton label="Referral Won" onClick={() => onQuickAction(agent, "Referral Received")} />
        </div>

        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="font-bold mb-2">Relationship Status</p>
          <select value={agent.relationship_status || "New Prospect"} onChange={(e) => onStatusChange(agent, e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
            {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => <span key={tag} className="text-xs bg-slate-800 border border-slate-700 rounded-full px-3 py-1">{tag}</span>)}
          </div>
        )}

        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="font-bold mb-2">Memory Notes</p>
          <p className="text-slate-300 whitespace-pre-wrap">{agent.notes || "No memory notes yet."}</p>
          {agent.favorite_food && <p className="text-slate-300 mt-3">Favorite food/drink: {agent.favorite_food}</p>}
          {agent.birthday && <p className="text-slate-300">Birthday: {agent.birthday}</p>}
        </div>

        <div>
          <h3 className="text-xl font-bold mb-3">Engagement Timeline</h3>
          {engagements.length === 0 ? (
            <p className="text-slate-300">No engagement history yet.</p>
          ) : (
            <div className="space-y-3">
              {engagements.map((engagement) => (
                <div key={engagement.id} className="border border-slate-700 rounded-2xl p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-bold">{engagement.engagement_type}</p>
                    <p className="text-sm text-slate-400">{engagement.engagement_date}</p>
                  </div>
                  {engagement.action_taken && <p className="text-sm text-slate-300 mt-1">Action: {engagement.action_taken}</p>}
                  {engagement.notes && <p className="mt-3 whitespace-pre-wrap">{engagement.notes}</p>}
                  {engagement.outcome && <p className="mt-3 text-slate-300">Outcome: {engagement.outcome}</p>}
                  {engagement.next_action && <p className="mt-3 text-slate-300">Next: {engagement.next_action}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-3 border-t border-slate-700">
          <button onClick={() => onArchive(agent)} className="text-slate-300 hover:underline">Move to Do Not Pursue</button>
          <button onClick={() => onDelete(agent)} className="text-red-300 hover:underline">Delete Permanently</button>
        </div>
      </div>
    </Modal>
  );
}

function SmartPlaybook() {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
      <h2 className="text-2xl font-bold mb-2">Relationship Playbook</h2>
      <p className="text-slate-400 text-sm mb-4">Use this when you are not sure what action to take next.</p>
      <div className="space-y-3 text-sm">
        <Play title="Cold or New" text="Short intro call, then office stop-in. Your goal is familiarity, not a referral." />
        <Play title="Needs Follow Up" text="Contact every 15 days. Ask one useful question, remember one personal detail, log the note." />
        <Play title="Warm" text="Contact every 30 days. Coffee, tacos, quick check-in, or useful storm update. Keep the relationship alive." />
        <Play title="Referral Partner" text="Protect this relationship. Thank them, report back quickly, and never let them wonder what happened." />
      </div>
    </section>
  );
}

function Play({ title, text }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-3">
      <p className="font-bold">{title}</p>
      <p className="text-slate-300">{text}</p>
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <div className={`rounded-2xl p-4 md:p-5 border shadow-xl ${tone === "urgent" ? "bg-red-950/40 border-red-800" : "bg-slate-900 border-slate-800"}`}>
      <p className="text-slate-400 text-sm">{label}</p>
      <h2 className="text-3xl md:text-4xl font-bold mt-1">{value}</h2>
    </div>
  );
}

function Info({ label, value, urgent }) {
  return (
    <div className="bg-slate-950/50 rounded-xl p-3">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`font-semibold ${urgent ? "text-red-300" : "text-slate-100"}`}>{value}</p>
    </div>
  );
}

function QuickButton({ label, onClick, dark }) {
  return (
    <button onClick={onClick} className={`${dark ? "bg-slate-800 text-slate-100 border border-slate-700" : "bg-white text-slate-950"} rounded-xl px-3 py-2 text-sm font-bold hover:opacity-90`}>
      {label}
    </button>
  );
}

function Input({ label, value, onChange, required = false, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}{required ? " *" : ""}</label>
      <input type={type} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required={required} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100" />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder = "", required = false }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}{required ? " *" : ""}</label>
      <textarea value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required={required} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 min-h-24 text-slate-100" />
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/75 z-50 p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-700 rounded-3xl p-5 md:p-6 mt-6 shadow-2xl">
        <div className="flex justify-between items-start gap-4 mb-5">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="bg-slate-800 px-3 py-1 rounded-xl">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function parseTagsSafe(tags) {
  if (!tags) return [];
  return String(tags).split(",").map((tag) => tag.trim()).filter(Boolean);
}
