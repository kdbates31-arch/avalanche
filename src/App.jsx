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

const TAG_OPTIONS = [
  "Responds to Text",
  "Gatekeeper Matters",
  "Likes Coffee",
  "Likes Tacos",
  "Sports Fan",
  "Family Notes",
  "Hard to Reach",
  "High Potential",
  "Already Sends Referrals",
  "Competitor Relationship"
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
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [quickActionAgent, setQuickActionAgent] = useState(null);
  const [quickActionType, setQuickActionType] = useState("");
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

  function agentName(agent) {
    const fullName = [agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ");
    return fullName || agent.agency_name || "Unnamed Agent";
  }

  function parseTags(tags) {
    if (!tags) return [];
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  function calculateRelationshipScore(agent, agentEngagements = []) {
    let score = 40;
    const remaining = daysUntil(agent.next_follow_up_date);

    if (agent.relationship_status === "Warm Relationship") score += 15;
    if (agent.relationship_status === "Active Referral Partner") score += 25;
    if (agent.relationship_status === "VIP Referral Partner") score += 35;
    if (agent.relationship_status === "Cold") score -= 15;
    if (agent.relationship_status === "Do Not Pursue") score = 0;

    if (remaining !== null && remaining < 0) score -= Math.min(30, Math.abs(remaining));
    if (remaining !== null && remaining >= 0 && remaining <= 7) score += 5;

    score += Math.min(20, agentEngagements.length * 4);
    score += Math.min(20, (agent.referral_count || 0) * 10);

    if (agent.last_contact_date) {
      const daysSinceContact = Math.abs(daysUntil(agent.last_contact_date));
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
      .neq("relationship_status", "Do Not Pursue")
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

    const nextDate =
      agentForm.next_follow_up_date ||
      calculateNextFollowUp(agentForm.relationship_status, agentForm.last_contact_date || todayDateString());

    const payload = {
      ...agentForm,
      next_follow_up_date: nextDate,
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
      await loadDashboard();
    }

    setSaving(false);
  }

  function openQuickAction(agent, type) {
    setQuickActionAgent(agent);
    setQuickActionType(type);
    setEngagementForm({
      engagement_type: type,
      action_taken: "",
      notes: "",
      outcome: "",
      next_action: ""
    });
  }

  async function saveEngagement(e) {
    e.preventDefault();
    if (!quickActionAgent) return;

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
      next_follow_up_date: nextDate,
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
    const today = agent.last_contact_date || todayDateString();
    const nextDate = calculateNextFollowUp(newStatus, today);

    const { error } = await supabase
      .from("agencies")
      .update({
        relationship_status: newStatus,
        is_active_referral_partner:
          newStatus === "Active Referral Partner" || newStatus === "VIP Referral Partner",
        next_follow_up_date: nextDate
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
    const confirmMove = window.confirm("Move this agent to Do Not Pursue?");
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
    const confirmDelete = window.confirm("Delete this agent permanently?");
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

  const missionAgents = enrichedAgents
    .filter((agent) => isDue(agent))
    .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));

  const needsFollowUp = enrichedAgents.filter((agent) => agent.relationship_status === "Needs Follow Up");
  const warmAgents = enrichedAgents.filter((agent) => agent.relationship_status === "Warm Relationship");
  const referralPartners = enrichedAgents.filter(
    (agent) =>
      agent.relationship_status === "Active Referral Partner" ||
      agent.relationship_status === "VIP Referral Partner" ||
      agent.is_active_referral_partner
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl">
          <p className="text-sm uppercase tracking-widest text-slate-400">Roofing Relationship OS</p>
          <h1 className="text-3xl md:text-5xl font-bold mt-1">Avalanche CRM</h1>
          <p className="text-slate-400 mt-2 max-w-3xl">
            Your daily command center for insurance agent relationships, follow-ups, memory, and referrals.
          </p>
        </header>

        {message && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard label="Today’s Mission" value={missionAgents.length} tone="urgent" />
          <MetricCard label="Needs Follow Up" value={needsFollowUp.length} />
          <MetricCard label="Warm" value={warmAgents.length} />
          <MetricCard label="Referral Partners" value={referralPartners.length} />
        </section>

        <section className="bg-red-950/40 border border-red-800 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold">Today’s Mission</h2>
              <p className="text-red-200 text-sm">Agents past their follow-up window, sorted by most overdue.</p>
            </div>
            <button onClick={loadDashboard} className="bg-white text-slate-950 px-4 py-2 rounded-xl font-semibold">
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-slate-300">Loading dashboard...</p>
          ) : missionAgents.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl p-4 text-slate-300">
              No overdue follow-ups right now. That is exactly what disciplined relationship work looks like.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {missionAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  engagements={agent.agentEngagements}
                  compact
                  onQuickAction={openQuickAction}
                  onStatusChange={updateStatus}
                  onArchive={moveToDoNotPursue}
                  onDelete={deleteAgent}
                  onSelect={setSelectedAgent}
                />
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Add Agent</h2>
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
          </div>

          <div className="xl:col-span-2 space-y-6">
            <AgentSection title="Needs Follow Up" subtitle="15-day relationship warming cycle" agents={needsFollowUp} engagements={engagements} onQuickAction={openQuickAction} onStatusChange={updateStatus} onArchive={moveToDoNotPursue} onDelete={deleteAgent} onSelect={setSelectedAgent} />
            <AgentSection title="Warm Relationships" subtitle="30-day keep-it-warm cycle" agents={warmAgents} engagements={engagements} onQuickAction={openQuickAction} onStatusChange={updateStatus} onArchive={moveToDoNotPursue} onDelete={deleteAgent} onSelect={setSelectedAgent} />
            <AgentSection title="Active Referral Partners" subtitle="Referral partners you intentionally chose to keep close" agents={referralPartners} engagements={engagements} onQuickAction={openQuickAction} onStatusChange={updateStatus} onArchive={moveToDoNotPursue} onDelete={deleteAgent} onSelect={setSelectedAgent} />
          </div>
        </section>
      </div>

      {quickActionAgent && (
        <Modal title={`${quickActionType}: ${agentName(quickActionAgent)}`} onClose={() => setQuickActionAgent(null)}>
          <form onSubmit={saveEngagement} className="space-y-4">
            {quickActionType === "Office Stop In" && (
              <Select label="Action Taken" value={engagementForm.action_taken} options={OFFICE_ACTIONS} onChange={(value) => setEngagementForm({ ...engagementForm, action_taken: value })} />
            )}

            {quickActionType !== "Office Stop In" && quickActionType !== "Phone Call" && (
              <Input label="Action Taken" value={engagementForm.action_taken} onChange={(value) => setEngagementForm({ ...engagementForm, action_taken: value })} placeholder="Short label for what happened" />
            )}

            <Textarea label="Engagement Notes" value={engagementForm.notes} onChange={(value) => setEngagementForm({ ...engagementForm, notes: value })} placeholder="What happened? Who was there? What did you learn?" required />
            <Textarea label="Outcome" value={engagementForm.outcome} onChange={(value) => setEngagementForm({ ...engagementForm, outcome: value })} placeholder="How did it go? Warmer? Neutral? Needs another touch?" />
            <Input label="Next Action" value={engagementForm.next_action} onChange={(value) => setEngagementForm({ ...engagementForm, next_action: value })} placeholder="Example: stop by next month with coffee" />

            <button disabled={saving} className="w-full bg-white text-slate-950 py-3 rounded-2xl font-bold disabled:opacity-50">
              {saving ? "Saving..." : "Save Engagement"}
            </button>
          </form>
        </Modal>
      )}

      {selectedAgent && (
        <Modal title={`${agentName(selectedAgent)} Timeline`} onClose={() => setSelectedAgent(null)}>
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-2xl p-4">
              <p className="text-slate-300">Agency</p>
              <p className="font-bold">{selectedAgent.agency_name}</p>
              <p className="text-slate-300 mt-3">Memory Notes</p>
              <p>{selectedAgent.notes || "No memory notes yet."}</p>
            </div>

            {(engagements[selectedAgent.id] || []).length === 0 ? (
              <p className="text-slate-300">No engagement history yet.</p>
            ) : (
              (engagements[selectedAgent.id] || []).map((engagement) => (
                <div key={engagement.id} className="border border-slate-700 rounded-2xl p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-bold">{engagement.engagement_type}</p>
                    <p className="text-sm text-slate-400">{engagement.engagement_date}</p>
                  </div>
                  {engagement.action_taken && <p className="text-sm text-slate-300 mt-1">Action: {engagement.action_taken}</p>}
                  {engagement.notes && <p className="mt-3">{engagement.notes}</p>}
                  {engagement.outcome && <p className="mt-3 text-slate-300">Outcome: {engagement.outcome}</p>}
                  {engagement.next_action && <p className="mt-3 text-slate-300">Next: {engagement.next_action}</p>}
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              engagements={engagements[agent.id] || []}
              onQuickAction={onQuickAction}
              onStatusChange={onStatusChange}
              onArchive={onArchive}
              onDelete={onDelete}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AgentCard({ agent, engagements, onQuickAction, onStatusChange, onArchive, onDelete, onSelect, compact = false }) {
  const overdue = agent.daysRemaining !== null && agent.daysRemaining < 0;
  const dueToday = agent.daysRemaining === 0;
  const tags = parseTagsSafe(agent.tags);
  const addressText = [agent.address, agent.city, agent.state].filter(Boolean).join(", ");

  return (
    <div className={`rounded-2xl border p-4 ${overdue || dueToday ? "bg-red-900/30 border-red-700" : "bg-slate-800 border-slate-700"}`}>
      <div className="flex justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{[agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name}</h3>
          <p className="text-slate-300">{agent.agency_name}</p>
          {agent.agent_phone && <a className="block text-blue-300 mt-1" href={`tel:${agent.agent_phone}`}>{agent.agent_phone}</a>}
          {agent.agent_email && <a className="block text-blue-300" href={`mailto:${agent.agent_email}`}>{agent.agent_email}</a>}
          {addressText && <a className="block text-blue-300 text-sm mt-1" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`} target="_blank" rel="noreferrer">Open Map</a>}
        </div>

        <div className="text-right">
          <div className="rounded-full bg-slate-950 border border-slate-700 h-16 w-16 flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{agent.score}</span>
            <span className="text-[10px] text-slate-400">score</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <Info label="Last Contact" value={agent.last_contact_date || "Not logged"} />
        <Info label="Next Follow Up" value={agent.next_follow_up_date || "Not set"} />
        <Info label="Days" value={agent.daysRemaining === null ? "No cycle" : agent.daysRemaining < 0 ? `${Math.abs(agent.daysRemaining)} overdue` : `${agent.daysRemaining} left`} urgent={overdue || dueToday} />
        <Info label="Referrals" value={agent.referral_count || 0} />
      </div>

      <div className="mt-4">
        <select value={agent.relationship_status || "New Prospect"} onChange={(e) => onStatusChange(agent, e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
          {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
        </select>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((tag) => <span key={tag} className="text-xs bg-slate-700 rounded-full px-3 py-1">{tag}</span>)}
        </div>
      )}

      {!compact && agent.notes && <div className="mt-3 bg-slate-950/50 rounded-xl p-3 text-sm text-slate-300">{agent.notes}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        <QuickButton label="Phone Call" onClick={() => onQuickAction(agent, "Phone Call")} />
        <QuickButton label="Office Stop In" onClick={() => onQuickAction(agent, "Office Stop In")} />
        <QuickButton label="Referral Ask" onClick={() => onQuickAction(agent, "Referral Request")} />
        <QuickButton label="Referral Won" onClick={() => onQuickAction(agent, "Referral Received")} />
      </div>

      <div className="flex flex-wrap gap-3 mt-4 text-sm">
        <button onClick={() => onSelect(agent)} className="text-blue-300 hover:underline">Timeline</button>
        <button onClick={() => onArchive(agent)} className="text-slate-300 hover:underline">Move to Do Not Pursue</button>
        <button onClick={() => onDelete(agent)} className="text-red-300 hover:underline">Delete</button>
      </div>

      {engagements.length > 0 && !compact && (
        <div className="mt-4 border-t border-slate-700 pt-3 text-sm text-slate-300">
          Last engagement: {engagements[0].engagement_type} on {engagements[0].engagement_date}
        </div>
      )}
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

function QuickButton({ label, onClick }) {
  return (
    <button onClick={onClick} className="bg-white text-slate-950 rounded-xl px-3 py-2 text-sm font-bold hover:opacity-90">
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
        <option value="">Select</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 p-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-700 rounded-3xl p-5 md:p-6 mt-8 shadow-2xl">
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
