import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const CC_EMAIL = "kristopher.bates@coolroofs.co";
const REFERRAL_STORAGE_KEY = "avalanche_referral_leads_v1";
const CARD_STORAGE_KEY = "avalanche_business_card_photos_v1";

const COLORS = {
  appBg: "#06111f",
  cardBg: "#0f172a",
  innerBg: "#1e293b",
  inputBg: "#111827",
  hoverBg: "#334155",
  border: "#334155",
  text: "#ffffff",
  secondary: "#cbd5e1",
  muted: "#94a3b8",
  disabled: "#64748b"
};

const STATUS_COLORS = {
  "New Prospect": { background: "#075985", color: "#bae6fd", border: "#38bdf8", accent: "#38bdf8" },
  "Needs Follow Up": { background: "#7c2d12", color: "#fdba74", border: "#fb923c", accent: "#f97316" },
  "Warm Relationship": { background: "#713f12", color: "#fde68a", border: "#facc15", accent: "#facc15" },
  "Maintenance Relationship": { background: "#1e3a8a", color: "#bfdbfe", border: "#60a5fa", accent: "#60a5fa" },
  "Active Referral Partner": { background: "#14532d", color: "#bbf7d0", border: "#22c55e", accent: "#22c55e" },
  "VIP Referral Partner": { background: "#78350f", color: "#fde68a", border: "#eab308", accent: "#eab308" },
  Cold: { background: "#374151", color: "#d1d5db", border: "#6b7280", accent: "#6b7280" },
  "Do Not Pursue": { background: "#111827", color: "#9ca3af", border: "#374151", accent: "#374151" }
};

const ACTION_COLORS = {
  call: { background: "#14532d", color: "#bbf7d0", border: "#22c55e" },
  text: { background: "#1e3a8a", color: "#bfdbfe", border: "#60a5fa" },
  email: { background: "#312e81", color: "#c7d2fe", border: "#818cf8" },
  map: { background: "#164e63", color: "#a5f3fc", border: "#22d3ee" },
  edit: { background: "#f8fafc", color: "#020617", border: "#ffffff" },
  save: { background: "#166534", color: "#dcfce7", border: "#22c55e" },
  ask: { background: "#713f12", color: "#fde68a", border: "#facc15" },
  won: { background: "#14532d", color: "#bbf7d0", border: "#22c55e" },
  caution: { background: "#92400e", color: "#ffedd5", border: "#fb923c" },
  delete: { background: "#991b1b", color: "#fee2e2", border: "#ef4444" },
  neutral: { background: "#1e293b", color: "#ffffff", border: "#475569" },
  sync: { background: "#4c1d95", color: "#ddd6fe", border: "#a78bfa" },
  disabled: { background: "#334155", color: "#94a3b8", border: "#475569" }
};

const TILE_ACCENTS = {
  attention: "#f97316",
  fifteen: "#fb923c",
  thirty: "#facc15",
  sixty: "#60a5fa",
  vip: "#eab308",
  sync: "#a78bfa"
};

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

const CONTACT_ORIGINS = [
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

const CONTACT_ROLE_SUGGESTIONS = [
  "Agent",
  "Agency Owner",
  "Producer",
  "Office Manager",
  "Claims Liaison",
  "Claims Adjuster",
  "CSR",
  "Realtor",
  "Broker",
  "Broker Owner",
  "Team Lead",
  "Transaction Coordinator",
  "Property Manager",
  "Maintenance Manager",
  "Regional Manager",
  "Operations Manager",
  "Owner",
  "Inspector",
  "Public Adjuster",
  "Project Manager",
  "Estimator",
  "Business Development",
  "Investor",
  "Acquisitions Manager"
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
  next_follow_up_date: "",
  business_card_front: "",
  business_card_back: ""
};

const EMPTY_REFERRAL = {
  sent_by_id: "",
  sent_by_name: "",
  agency_name: "",
  agency_office_address: "",
  agency_city: "",
  agency_state: "TX",
  agency_phone: "",
  agent_phone: "",
  agent_email: "",
  customer_first_name: "",
  customer_last_name: "",
  customer_phone: "",
  customer_email: "",
  property_address_1: "",
  property_address_2: "",
  property_city: "",
  property_state: "TX",
  property_zip: "",
  referral_notes: "",
  sync_status: "Not Synced",
  sync_message: "Ready for JobNimbus integration setup",
  created_at: "",
  updated_at: "",
  jobnimbus_agency_contact_id: "",
  jobnimbus_customer_contact_id: "",
  jobnimbus_job_id: ""
};

const EMPTY_LOG = {
  action_taken: "",
  notes: "",
  outcome: "",
  next_action: ""
};

const EMPTY_CARD_PHOTOS = {
  front: "",
  back: ""
};

function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.Cold;
}

function getStatusBadgeStyle(status) {
  const color = getStatusColor(status);
  return {
    display: "inline-block",
    borderRadius: 999,
    padding: "9px 15px",
    fontSize: 16,
    fontWeight: 900,
    marginTop: 8,
    marginBottom: 10,
    background: color.background,
    color: color.color,
    border: `1px solid ${color.border}`,
    boxShadow: `0 0 0 1px rgba(255,255,255,.04), 0 0 18px ${color.accent}22`,
    lineHeight: 1.15
  };
}

function StatusBadge({ status }) {
  return <div style={getStatusBadgeStyle(status)}>{status || "No Status"}</div>;
}

function SyncBadge({ status }) {
  const map = {
    "Not Synced": { background: "#4c1d95", color: "#ddd6fe", border: "#a78bfa" },
    Queued: { background: "#78350f", color: "#fde68a", border: "#eab308" },
    Synced: { background: "#14532d", color: "#bbf7d0", border: "#22c55e" },
    Error: { background: "#991b1b", color: "#fee2e2", border: "#ef4444" }
  };
  const color = map[status] || map["Not Synced"];
  return <span style={{ ...styles.badge, ...color }}>{status}</span>;
}

function actionStyle(type, fullWidth = false) {
  const color = ACTION_COLORS[type] || ACTION_COLORS.neutral;
  return {
    borderRadius: 12,
    padding: "10px 12px",
    border: `1px solid ${color.border}`,
    fontWeight: 900,
    background: color.background,
    color: color.color,
    textDecoration: "none",
    textAlign: "center",
    boxShadow: "0 1px 0 rgba(255,255,255,.08) inset",
    width: fullWidth ? "100%" : undefined
  };
}

function makeId() {
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadCardPhotoStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(CARD_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveCardPhotoStore(next) {
  localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(next));
}

function getCardPhotos(contactId) {
  if (!contactId) return EMPTY_CARD_PHOTOS;
  const store = loadCardPhotoStore();
  return store[String(contactId)] || EMPTY_CARD_PHOTOS;
}

function saveCardPhotos(contactId, photos) {
  if (!contactId) return;
  const store = loadCardPhotoStore();
  store[String(contactId)] = photos || EMPTY_CARD_PHOTOS;
  saveCardPhotoStore(store);
}

function deleteCardPhotos(contactId) {
  if (!contactId) return;
  const store = loadCardPhotoStore();
  delete store[String(contactId)];
  saveCardPhotoStore(store);
}

function referralCustomerName(ref) {
  return [ref.customer_first_name, ref.customer_last_name].filter(Boolean).join(" ") || "Unnamed Referral Lead";
}

function referralAddress(ref) {
  return [ref.property_address_1, ref.property_address_2, ref.property_city, ref.property_state, ref.property_zip].filter(Boolean).join(", ");
}

function agencyOfficeAddress(agent) {
  return [agent.address, agent.city, agent.state].filter(Boolean).join(", ");
}

export default function App() {
  const [tab, setTab] = useState("mission");
  const [addMode, setAddMode] = useState("relationship");
  const [agents, setAgents] = useState([]);
  const [logs, setLogs] = useState({});
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [agentForm, setAgentForm] = useState(EMPTY_AGENT);
  const [agentCardPhotos, setAgentCardPhotos] = useState(EMPTY_CARD_PHOTOS);
  const [referralForm, setReferralForm] = useState({ ...EMPTY_REFERRAL, created_at: todayStatic(), updated_at: todayStatic() });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [originFilter, setOriginFilter] = useState("All");
  const [strengthFilter, setStrengthFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [editingCardPhotos, setEditingCardPhotos] = useState(EMPTY_CARD_PHOTOS);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [editingReferral, setEditingReferral] = useState(null);
  const [callAgent, setCallAgent] = useState(null);
  const [logAgent, setLogAgent] = useState(null);
  const [logType, setLogType] = useState("Phone Call");
  const [logForm, setLogForm] = useState(EMPTY_LOG);

  useEffect(() => {
    loadAgents();
    loadReferrals();
  }, []);

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  function loadReferrals() {
    try {
      const saved = JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY) || "[]");
      setReferrals(Array.isArray(saved) ? saved : []);
    } catch {
      setReferrals([]);
    }
  }

  function saveReferrals(next) {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(next));
    setReferrals(next);
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

  function getDaysSince(dateText) {
    if (!dateText) return null;
    const todayDate = new Date(today() + "T00:00:00");
    const triggerDate = new Date(dateText + "T00:00:00");
    todayDate.setHours(0, 0, 0, 0);
    triggerDate.setHours(0, 0, 0, 0);
    return Math.floor((todayDate - triggerDate) / 86400000);
  }

  function isDateTriggeredActionDue(triggerDate, triggerDays) {
    if (!triggerDate || triggerDays == null) return false;
    const daysSinceTrigger = getDaysSince(triggerDate);
    return daysSinceTrigger !== null && daysSinceTrigger >= triggerDays;
  }

  function isContactDueByStatus(agent) {
    const triggerDays = cadence(agent.relationship_status);
    if (triggerDays == null) return false;
    return isDateTriggeredActionDue(agent.last_contact_date, triggerDays);
  }

  function nextFollowUp(status, baseDate) {
    const days = cadence(status);
    return days ? addDays(baseDate || today(), days) : null;
  }

  function daysUntilDate(dateText) {
    if (!dateText) return null;
    const a = new Date(today() + "T00:00:00");
    const b = new Date(dateText + "T00:00:00");
    return Math.ceil((b - a) / 86400000);
  }

  function daysUntilStatusDue(agent) {
    const triggerDays = cadence(agent.relationship_status);
    if (triggerDays == null) return null;
    const daysSince = getDaysSince(agent.last_contact_date);
    if (daysSince == null) return null;
    return triggerDays - daysSince;
  }

  function fullName(agent) {
    return [agent.agent_first_name, agent.agent_last_name].filter(Boolean).join(" ") || agent.agency_name || "Unnamed Contact";
  }


  function emailSubject() {
    return "Following up from CoolRoofs";
  }

  function emailBody(agent) {
    return `Hi ${agent.agent_first_name || ""},\n\n`;
  }

  function emailHref(agent) {
    if (!agent.agent_email) return "#";
    return `mailto:${agent.agent_email}?cc=${encodeURIComponent(CC_EMAIL)}&subject=${encodeURIComponent(emailSubject(agent))}&body=${encodeURIComponent(emailBody(agent))}`;
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

    if (!agentForm.agency_name.trim()) return setMessage("Company name is required.");
    if (!agentForm.agent_first_name.trim() && !agentForm.agent_last_name.trim()) return setMessage("Contact first or last name is required.");

    setSaving(true);

    try {
      const last = agentForm.last_contact_date || null;
      const next = agentForm.next_follow_up_date || null;
      const payload = { ...agentForm, last_contact_date: last, next_follow_up_date: next, business_card_front: agentCardPhotos.front || "", business_card_back: agentCardPhotos.back || "" };

      const { data: insertedRows, error } = await supabase
        .from("agencies")
        .insert([payload])
        .select("id");

      if (error) {
        setMessage("Save failed: " + error.message);
        return;
      }

      const newId = insertedRows && insertedRows[0] ? insertedRows[0].id : null;
      if (newId) saveCardPhotos(newId, agentCardPhotos);

      setMessage("Relationship Contact saved.");
      setAgentCardPhotos(EMPTY_CARD_PHOTOS);
      setAgentForm(EMPTY_AGENT);
      setTab("contacts");
      await loadAgents();
    } catch (err) {
      setMessage("Save failed unexpectedly: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  function populateReferralSource(agentId, targetSetter = setReferralForm) {
    const agent = enrichedAgents.find((a) => String(a.id) === String(agentId));
    if (!agent) return;

    targetSetter((current) => ({
      ...current,
      sent_by_id: String(agent.id),
      sent_by_name: agent.name,
      agency_name: agent.agency_name || "",
      agency_office_address: agent.address || "",
      agency_city: agent.city || "",
      agency_state: agent.state || "TX",
      agency_phone: agent.main_phone || "",
      agent_phone: agent.agent_phone || "",
      agent_email: agent.agent_email || "",
      updated_at: today()
    }));
  }

  function saveReferralLead(e) {
    e.preventDefault();
    setMessage("");

    if (!referralForm.sent_by_id) return setMessage("Select who sent the referral.");
    if (!referralForm.customer_first_name.trim() && !referralForm.customer_last_name.trim()) return setMessage("Customer first or last name is required.");
    if (!referralForm.property_address_1.trim()) return setMessage("Property address is required.");

    const now = today();
    const lead = {
      ...referralForm,
      id: makeId(),
      sync_status: "Not Synced",
      sync_message: "Ready for JobNimbus integration setup",
      created_at: now,
      updated_at: now
    };

    saveReferrals([lead, ...referrals]);
    setReferralForm({ ...EMPTY_REFERRAL, created_at: today(), updated_at: today() });
    setAddMode("relationship");
    setTab("contacts");
    setMessage("Referral Lead saved locally. JobNimbus sync placeholder is ready for later setup.");
  }

  function updateReferralLead(e) {
    e.preventDefault();
    if (!editingReferral) return;
    const updated = { ...editingReferral, updated_at: today() };
    const next = referrals.map((item) => item.id === updated.id ? updated : item);
    saveReferrals(next);
    setEditingReferral(null);
    setSelectedReferral(null);
    setMessage("Referral Lead updated.");
  }

  function markReferralQueued(referral) {
    const next = referrals.map((item) => {
      if (item.id !== referral.id) return item;
      return {
        ...item,
        sync_status: "Queued",
        sync_message: "JobNimbus sync is queued. API connection will be added later this week.",
        updated_at: today()
      };
    });
    saveReferrals(next);
    setSelectedReferral(null);
    setMessage("Referral Lead queued for future JobNimbus sync. No broken link. No data lost.");
  }

  function deleteReferral(referral) {
    const confirmed = window.confirm("Delete this Referral Lead from Avalanche? This cannot be undone.");
    if (!confirmed) return;
    saveReferrals(referrals.filter((item) => item.id !== referral.id));
    setSelectedReferral(null);
    setEditingReferral(null);
    setMessage("Referral Lead deleted.");
  }

  function startEdit(agent) {
    setEditingCardPhotos({ front: agent.business_card_front || getCardPhotos(agent.id).front || "", back: agent.business_card_back || getCardPhotos(agent.id).back || "" });
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

    if (!editingAgent.agency_name.trim()) return setMessage("Company name is required.");
    if (!editingAgent.agent_first_name.trim() && !editingAgent.agent_last_name.trim()) return setMessage("Contact first or last name is required.");

    setSaving(true);

    try {
      const { id, name, days, history, ...payload } = editingAgent;
      payload.last_contact_date = payload.last_contact_date || null;
      payload.next_follow_up_date = payload.next_follow_up_date || null;
      payload.business_card_front = editingCardPhotos.front || "";
      payload.business_card_back = editingCardPhotos.back || "";

      const { error } = await supabase.from("agencies").update(payload).eq("id", editingAgent.id);

      if (error) {
        setMessage("Update failed: " + error.message);
        return;
      }

      try {
        saveCardPhotos(editingAgent.id, editingCardPhotos);
      } catch (photoError) {
        setMessage("Contact updated, but card photos were too large to save. Try a smaller image.");
        setEditingAgent(null);
        setSelectedAgent(null);
        await loadAgents();
        return;
      }

      setMessage("Relationship Contact updated.");
      setEditingAgent(null);
      setSelectedAgent(null);
      await loadAgents();
    } catch (err) {
      setMessage("Update failed unexpectedly: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  async function moveToDoNotPursue(agent) {
    const confirmed = window.confirm("Move this contact to Do Not Pursue? They will stay saved but disappear from active workflows.");
    if (!confirmed) return;
    const { error } = await supabase.from("agencies").update({ relationship_status: "Do Not Pursue", next_follow_up_date: null }).eq("id", agent.id);
    if (error) setMessage("Move failed: " + error.message);
    else {
      setMessage("Contact moved to Do Not Pursue.");
      setSelectedAgent(null);
      await loadAgents();
    }
  }

  async function deleteAgent(agent) {
    const confirmed = window.confirm("Delete this contact permanently? This cannot be undone.");
    if (!confirmed) return;
    const { error } = await supabase.from("agencies").delete().eq("id", agent.id);
    if (error) setMessage("Delete failed: " + error.message);
    else {
      deleteCardPhotos(agent.id);
      setMessage("Contact deleted.");
      setSelectedAgent(null);
      setEditingAgent(null);
      await loadAgents();
    }
  }

  async function emailAndLog(agent) {
    if (!agent.agent_email) return setMessage("No email address saved for this contact.");

    const now = today();
    const next = null;
    const subject = emailSubject(agent);
    const body = emailBody(agent);

    const { error: logError } = await supabase.from("engagements").insert([{
      agency_id: agent.id,
      engagement_type: "Email Sent",
      engagement_date: now,
      action_taken: "Email",
      notes: `Email opened from Avalanche CRM.\n\nSubject: ${subject}\n\nBody:\n${body}`,
      outcome: "Email follow-up initiated",
      next_action: ""
    }]);

    if (logError) {
      setMessage("Email opened, but activity log failed: " + logError.message);
      window.location.href = emailHref(agent);
      return;
    }

    const { error: updateError } = await supabase.from("agencies").update({
      last_contact_date: now,
      next_follow_up_date: next,
      last_engagement_type: "Email Sent",
      engagement_count: Number(agent.engagement_count || 0) + 1
    }).eq("id", agent.id);

    if (updateError) setMessage("Email logged, but follow-up date reset failed: " + updateError.message);
    else setMessage("Email logged and follow-up date reset.");

    await loadAgents();
    window.location.href = emailHref(agent);
  }

  function startLog(agent, type) {
    setLogAgent(agent);
    setLogType(type);
    setLogForm({
      action_taken: type === "Office Stop In" ? "Coffee" : type === "Text Message" ? "Text Message" : "",
      notes: "",
      outcome: "",
      next_action: ""
    });
  }

  async function saveActivity(e) {
    e.preventDefault();
    if (!logAgent) return;
    if (!logForm.notes.trim()) return setMessage("Activity notes are required.");

    setSaving(true);
    setMessage("");
    const now = today();
    const newStatus = logType === "Referral Received" ? "Active Referral Partner" : logAgent.relationship_status;
    const next = null;

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

    const { error: updateError } = await supabase.from("agencies").update(updates).eq("id", logAgent.id);
    if (updateError) setMessage("Activity saved, but contact update failed: " + updateError.message);
    else setMessage("Activity logged.");

    setLogAgent(null);
    setLogForm(EMPTY_LOG);
    setSaving(false);
    await loadAgents();
  }

  const enrichedAgents = useMemo(() => {
    return agents.map((agent) => ({
      ...agent,
      name: fullName(agent),
      days: daysUntilStatusDue(agent),
      history: logs[agent.id] || []
    }));
  }, [agents, logs]);

  function sortOldestTouchFirst(list) {
    return [...list].sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  }

  function sortScheduledFollowUps(list) {
    return [...list].sort((a, b) => {
      const aDays = daysUntilDate(a.next_follow_up_date) ?? 9999;
      const bDays = daysUntilDate(b.next_follow_up_date) ?? 9999;
      return aDays - bDays;
    });
  }

  const activeAgents = enrichedAgents.filter((a) => a.relationship_status !== "Do Not Pursue");
  const scheduledFollowUps = sortScheduledFollowUps(activeAgents.filter((a) => a.next_follow_up_date && daysUntilDate(a.next_follow_up_date) <= 0));
  const follow15 = sortOldestTouchFirst(activeAgents.filter((a) => ["New Prospect", "Needs Follow Up"].includes(a.relationship_status) && isDateTriggeredActionDue(a.last_contact_date, 15)));
  const warm30 = sortOldestTouchFirst(activeAgents.filter((a) => a.relationship_status === "Warm Relationship" && isDateTriggeredActionDue(a.last_contact_date, 30)));
  const maintenance60 = sortOldestTouchFirst(activeAgents.filter((a) => a.relationship_status === "Maintenance Relationship" && isDateTriggeredActionDue(a.last_contact_date, 60)));
  const vipSuggestions = sortOldestTouchFirst(activeAgents.filter((a) => a.relationship_status === "VIP Referral Partner" && isDateTriggeredActionDue(a.last_contact_date, 45)));
  const activePartners = activeAgents.filter((a) => a.relationship_status === "Active Referral Partner");
  const vipPartners = activeAgents.filter((a) => a.relationship_status === "VIP Referral Partner");
  const pendingSync = referrals.filter((item) => item.sync_status !== "Synced");

  const roleOptions = useMemo(() => {
    const roles = enrichedAgents.map((a) => a.contact_role).filter(Boolean);
    return Array.from(new Set(roles)).sort();
  }, [enrichedAgents]);

  const categorySummary = useMemo(() => {
    return COMPANY_TYPES.map((type) => ({ type, count: enrichedAgents.filter((a) => a.company_type === type).length })).filter((item) => item.count > 0);
  }, [enrichedAgents]);

  const originSummary = useMemo(() => {
    return CONTACT_ORIGINS.map((source) => ({ source, count: enrichedAgents.filter((a) => a.referral_source === source).length })).filter((item) => item.count > 0);
  }, [enrichedAgents]);

  const strengthSummary = useMemo(() => {
    return RELATIONSHIP_STRENGTH.map((strength) => ({ strength, count: enrichedAgents.filter((a) => a.relationship_strength === strength).length })).filter((item) => item.count > 0);
  }, [enrichedAgents]);

  const referralAttributionSummary = useMemo(() => {
    const map = {};
    referrals.forEach((ref) => {
      const name = ref.sent_by_name || "Unknown Source";
      if (!map[name]) map[name] = { source: name, count: 0 };
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [referrals]);

  const recentActivity = useMemo(() => {
    const allLogs = [];
    Object.entries(logs).forEach(([agencyId, items]) => {
      const agent = enrichedAgents.find((a) => String(a.id) === String(agencyId));
      (items || []).forEach((item) => {
        allLogs.push({ ...item, contact_name: agent ? agent.name : "Unknown Contact", company_name: agent ? agent.agency_name : "Unknown Company" });
      });
    });
    return allLogs.sort((a, b) => String(b.engagement_date || "").localeCompare(String(a.engagement_date || ""))).slice(0, 8);
  }, [logs, enrichedAgents]);

  const directory = useMemo(() => {
    let list = [...enrichedAgents];
    const q = search.trim().toLowerCase();

    if (statusFilter === "Scheduled Follow Ups") list = list.filter((a) => a.next_follow_up_date && daysUntilDate(a.next_follow_up_date) <= 0);
    else if (statusFilter === "15 Day Due") list = list.filter((a) => ["New Prospect", "Needs Follow Up"].includes(a.relationship_status) && isDateTriggeredActionDue(a.last_contact_date, 15));
    else if (statusFilter === "30 Day Due") list = list.filter((a) => a.relationship_status === "Warm Relationship" && isDateTriggeredActionDue(a.last_contact_date, 30));
    else if (statusFilter === "60 Day Due") list = list.filter((a) => a.relationship_status === "Maintenance Relationship" && isDateTriggeredActionDue(a.last_contact_date, 60));
    else if (statusFilter === "VIP Suggestions") list = list.filter((a) => a.relationship_status === "VIP Referral Partner" && isDateTriggeredActionDue(a.last_contact_date, 45));
    else if (statusFilter !== "All") list = list.filter((a) => a.relationship_status === statusFilter);

    if (companyFilter !== "All") list = list.filter((a) => a.company_type === companyFilter);
    if (originFilter !== "All") list = list.filter((a) => a.referral_source === originFilter);
    if (strengthFilter !== "All") list = list.filter((a) => a.relationship_strength === strengthFilter);
    if (roleFilter !== "All") list = list.filter((a) => a.contact_role === roleFilter);

    if (q) {
      list = list.filter((a) => [a.name, a.agency_name, a.company_type, a.contact_role, a.referral_source, a.relationship_strength, a.agent_phone, a.main_phone, a.agent_email, a.city, a.notes].filter(Boolean).join(" ").toLowerCase().includes(q));
    }

    return list.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  }, [enrichedAgents, search, statusFilter, companyFilter, originFilter, strengthFilter, roleFilter]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setCompanyFilter("All");
    setOriginFilter("All");
    setStrengthFilter("All");
    setRoleFilter("All");
  }

  function openDueBucket(bucket) {
    resetFilters();
    setStatusFilter(bucket);
    setTab("contacts");
  }

  function filterCompany(type) {
    resetFilters();
    setCompanyFilter(type);
    setTab("contacts");
  }

  function filterOrigin(source) {
    resetFilters();
    setOriginFilter(source);
    setTab("contacts");
  }

  function filterStrength(strength) {
    resetFilters();
    setStrengthFilter(strength);
    setTab("contacts");
  }

  return (
    <div style={styles.app}>
      <main style={styles.screen}>
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>Avalanche CRM</div>
            <h1 style={styles.h1}>{tab === "mission" ? "Today's Mission" : tab === "contacts" ? "Contacts" : tab === "add" ? "Add Record" : tab === "partners" ? "Partners" : "Playbook"}</h1>
          </div>
          <button style={actionStyle("neutral")} onClick={() => { loadAgents(); loadReferrals(); }}>Refresh</button>
        </header>

        {message && <div style={styles.message}>{message}</div>}
        {loading && <div style={styles.card}>Loading...</div>}

        {!loading && tab === "mission" && (
          <div style={styles.stack}>
            <div style={styles.tiles}>
              <Tile label="Scheduled Follow Ups" value={scheduledFollowUps.length} onClick={() => openDueBucket("Scheduled Follow Ups")} accent={TILE_ACCENTS.sync} />
              <Tile label="15+ Day Touches" value={follow15.length} onClick={() => openDueBucket("15 Day Due")} accent={TILE_ACCENTS.fifteen} />
              <Tile label="30+ Day Touches" value={warm30.length} onClick={() => openDueBucket("30 Day Due")} accent={TILE_ACCENTS.thirty} />
              <Tile label="60+ Day Touches" value={maintenance60.length} onClick={() => openDueBucket("60 Day Due")} accent={TILE_ACCENTS.sixty} />
              <Tile label="VIP Relationship Touches" value={vipSuggestions.length} onClick={() => openDueBucket("VIP Suggestions")} accent={TILE_ACCENTS.vip} />
              <Tile label="Pending JobNimbus Sync" value={pendingSync.length} onClick={() => setTab("contacts")} accent={TILE_ACCENTS.sync} />
            </div>

            {categorySummary.length > 0 && <SummarySection title="Relationship Categories" subtitle="Current contact mix by company type." items={categorySummary} labelKey="type" onClick={filterCompany} />}
            {originSummary.length > 0 && <SummarySection title="Contact Origin Snapshot" subtitle="How these relationship contacts entered your network." items={originSummary} labelKey="source" onClick={filterOrigin} />}
            {referralAttributionSummary.length > 0 && <SummarySection title="Referral Attribution Snapshot" subtitle="Who is sending roofing opportunities into Avalanche." items={referralAttributionSummary} labelKey="source" onClick={() => setTab("contacts")} />}
            {strengthSummary.length > 0 && <SummarySection title="Trust Level Snapshot" subtitle="How strong your current network feels." items={strengthSummary} labelKey="strength" onClick={filterStrength} />}

            <Section title="Recent Referral Leads" subtitle="Saved intake records. JobNimbus sync is staged for later setup.">
              {referrals.length === 0 ? <p>No Referral Leads saved yet.</p> : referrals.slice(0, 5).map((ref) => <ReferralRow key={ref.id} referral={ref} open={() => setSelectedReferral(ref)} />)}
            </Section>

            <Section title="Recent Activity" subtitle="Latest relationship touches logged in the CRM.">
              {recentActivity.length === 0 ? <p>No activity logged yet.</p> : recentActivity.map((item) => <ActivityPreview key={item.id} item={item} />)}
            </Section>
          </div>
        )}

        {!loading && tab === "contacts" && (
          <div style={styles.stack}>
            <Section title="Referral Leads" subtitle="Customer/job intake records created from relationship referrals.">
              {referrals.length === 0 ? <p>No Referral Leads saved yet.</p> : referrals.map((ref) => <ReferralRow key={ref.id} referral={ref} open={() => setSelectedReferral(ref)} />)}
            </Section>

            <div style={styles.card}>
              <button style={actionStyle("neutral", true)} onClick={resetFilters}>Show All Relationship Contacts</button>
              <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search relationship contacts, companies, roles, origins..." />
              <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                <option>Scheduled Follow Ups</option>
                <option>15 Day Due</option>
                <option>30 Day Due</option>
                <option>60 Day Due</option>
                <option>VIP Suggestions</option>
                {STATUSES.map((x) => <option key={x}>{x}</option>)}
              </select>
              <select style={styles.input} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}><option>All</option>{COMPANY_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
              <select style={styles.input} value={originFilter} onChange={(e) => setOriginFilter(e.target.value)}><option value="All">All Contact Origins</option>{CONTACT_ORIGINS.map((x) => <option key={x}>{x}</option>)}</select>
              <select style={styles.input} value={strengthFilter} onChange={(e) => setStrengthFilter(e.target.value)}><option value="All">All Trust Levels</option>{RELATIONSHIP_STRENGTH.map((x) => <option key={x}>{x}</option>)}</select>
              <select style={styles.input} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="All">All Roles</option>{roleOptions.map((x) => <option key={x}>{x}</option>)}</select>
            </div>
            <Section title={`Relationship Contact Directory (${directory.length})`} subtitle="Search or filter by status, company type, origin, role, or trust level.">
              {directory.length === 0 ? <p>No contacts match this filter.</p> : directory.map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} openCall={() => setCallAgent(agent)} emailAndLog={() => emailAndLog(agent)} />)}
            </Section>
          </div>
        )}

        {!loading && tab === "add" && (
          <div style={styles.stack}>
            <div style={styles.card}>
              <h2>Add Record</h2>
              <p style={styles.sub}>Choose what you are entering into Avalanche.</p>
              <div style={styles.modeGrid}>
                <button style={addMode === "relationship" ? styles.modeButtonOn : styles.modeButton} onClick={() => setAddMode("relationship")}>Relationship Contact</button>
                <button style={addMode === "referral" ? styles.modeButtonOn : styles.modeButton} onClick={() => setAddMode("referral")}>Referral Lead</button>
              </div>
            </div>
            {addMode === "relationship" ? (
              <ContactForm form={agentForm} setForm={setAgentForm} cardPhotos={agentCardPhotos} setCardPhotos={setAgentCardPhotos} onSubmit={saveAgent} saving={saving} nextFollowUp={nextFollowUp} today={today} buttonText="Save Relationship Contact" />
            ) : (
              <ReferralLeadForm form={referralForm} setForm={setReferralForm} agents={enrichedAgents} populateReferralSource={populateReferralSource} onSubmit={saveReferralLead} buttonText="Save Referral Lead" />
            )}
          </div>
        )}

        {!loading && tab === "partners" && (
          <div style={styles.stack}>
            <Section title="Active Referral Partners" subtitle="Referral relationships already producing or actively trusted.">
              {activePartners.length === 0 ? <p>No active referral partners yet.</p> : activePartners.map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} openCall={() => setCallAgent(agent)} emailAndLog={() => emailAndLog(agent)} />)}
            </Section>
            <Section title="VIP Referral Partners" subtitle="Strategic relationships worth protecting intentionally.">
              {vipPartners.length === 0 ? <p>No VIP referral partners yet.</p> : vipPartners.map((agent) => <ContactRow key={agent.id} agent={agent} open={() => setSelectedAgent(agent)} openCall={() => setCallAgent(agent)} emailAndLog={() => emailAndLog(agent)} soft />)}
            </Section>
          </div>
        )}

        {!loading && tab === "playbook" && <Playbook />}
      </main>

      <nav style={styles.nav}>
        <button style={tab === "mission" ? styles.navOn : styles.navButton} onClick={() => setTab("mission")}>Mission</button>
        <button style={tab === "contacts" ? styles.navOn : styles.navButton} onClick={() => setTab("contacts")}>Contacts</button>
        <button style={tab === "add" ? styles.navOn : styles.navButton} onClick={() => setTab("add")}>Add</button>
        <button style={tab === "partners" ? styles.navOn : styles.navButton} onClick={() => setTab("partners")}>Partners</button>
        <button style={tab === "playbook" ? styles.navOn : styles.navButton} onClick={() => setTab("playbook")}>Playbook</button>
      </nav>

      {selectedAgent && <ContactProfile agent={selectedAgent} cardPhotos={{ front: selectedAgent.business_card_front || getCardPhotos(selectedAgent.id).front || "", back: selectedAgent.business_card_back || getCardPhotos(selectedAgent.id).back || "" }} logs={logs[selectedAgent.id] || []} close={() => setSelectedAgent(null)} startEdit={startEdit} deleteAgent={deleteAgent} moveToDoNotPursue={moveToDoNotPursue} openCall={() => setCallAgent(selectedAgent)} emailAndLog={() => emailAndLog(selectedAgent)} startLog={startLog} />}
      {selectedReferral && <ReferralProfile referral={selectedReferral} close={() => setSelectedReferral(null)} edit={() => { setEditingReferral(selectedReferral); setSelectedReferral(null); }} markQueued={markReferralQueued} deleteReferral={deleteReferral} />}
      {editingReferral && <ReferralEditModal form={editingReferral} setForm={setEditingReferral} agents={enrichedAgents} populateReferralSource={populateReferralSource} updateReferralLead={updateReferralLead} close={() => setEditingReferral(null)} />}
      {callAgent && <CallChoiceModal agent={callAgent} close={() => setCallAgent(null)} startLog={startLog} />}
      {logAgent && <ActivityLogModal agent={logAgent} type={logType} form={logForm} setForm={setLogForm} saveActivity={saveActivity} saving={saving} close={() => setLogAgent(null)} />}
      {editingAgent && <EditModal form={editingAgent} setForm={setEditingAgent} cardPhotos={editingCardPhotos} setCardPhotos={setEditingCardPhotos} updateAgent={updateAgent} saving={saving} close={() => setEditingAgent(null)} nextFollowUp={nextFollowUp} today={today} />}
    </div>
  );
}

function Tile({ label, value, onClick, accent }) {
  return (
    <button style={{ ...styles.tile, borderColor: accent, boxShadow: `0 0 0 1px ${accent}33, 0 0 18px ${accent}16` }} onClick={onClick}>
      <div style={{ marginBottom: 10, color: COLORS.secondary }}>{label}</div>
      <b style={{ fontSize: 28, color: accent }}>{value}</b>
    </button>
  );
}

function SummarySection({ title, subtitle, items, labelKey, onClick }) {
  return (
    <Section title={title} subtitle={subtitle}>
      <div style={styles.summaryGrid}>
        {items.map((item) => (
          <button key={item[labelKey]} style={styles.summaryCard} onClick={() => onClick(item[labelKey])}>
            <div style={{ marginBottom: 10, color: COLORS.secondary }}>{item[labelKey]}</div>
            <b style={{ fontSize: 28, color: COLORS.text }}>{item.count}</b>
          </button>
        ))}
      </div>
    </Section>
  );
}

function Section({ title, subtitle, children }) {
  return <section style={styles.card}><h2>{title}</h2><p style={styles.sub}>{subtitle}</p><div style={styles.stack}>{children}</div></section>;
}

function ReferralRow({ referral, open }) {
  return (
    <div style={{ ...styles.row, borderLeft: `6px solid ${TILE_ACCENTS.sync}` }} onClick={open}>
      <b>{referralCustomerName(referral)}</b>
      <p>{referralAddress(referral) || "No property address"}</p>
      <small>Sent by {referral.sent_by_name || "Unknown"} · {referral.agency_name || "No agency"}</small>
      <div style={styles.actionRowSmall}><SyncBadge status={referral.sync_status} /></div>
    </div>
  );
}

function ContactRow({ agent, open, openCall, emailAndLog, soft }) {
  const scheduledDays = agent.next_follow_up_date ? daysUntilDateFromToday(agent.next_follow_up_date) : null;
  const label = scheduledDays !== null && scheduledDays <= 0
    ? scheduledDays < 0 ? `Scheduled follow-up ${Math.abs(scheduledDays)} days late` : "Scheduled follow-up today"
    : agent.days === null ? "No cadence trigger" : agent.days < 0 ? `${Math.abs(agent.days)} days past cadence` : agent.days === 0 ? "Ready for cadence touch" : `${agent.days} days left in cadence`;
  const statusColor = getStatusColor(agent.relationship_status);
  return (
    <div style={{ ...(soft ? styles.softRow : styles.row), borderLeft: `6px solid ${statusColor.accent}` }}>
      <div onClick={open} style={{ cursor: "pointer" }}>
        <b>{agent.name}</b>
        <p>{agent.agency_name}</p>
        <div style={styles.statusLine}>
          <StatusBadge status={agent.relationship_status} />
        </div>
        <div style={styles.metaStack}>
          <small>{agent.company_type || "No Type"} · {agent.contact_role || "No Role"}</small>
          <small>{label}</small>
        </div>
      </div>
      <div style={styles.actionRowSmall}>
        {(agent.agent_phone || agent.main_phone) && <button style={actionStyle("call")} onClick={openCall}>Call</button>}
        {agent.agent_email && <button style={actionStyle("email")} onClick={emailAndLog}>Email</button>}
        <button style={actionStyle("neutral")} onClick={open}>Open</button>
      </div>
    </div>
  );
}

function ContactProfile({ agent, cardPhotos, logs, close, startEdit, deleteAgent, moveToDoNotPursue, openCall, emailAndLog, startLog }) {
  const address = agencyOfficeAddress(agent);
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={actionStyle("neutral")} onClick={close}>Close</button>
        <StatusBadge status={agent.relationship_status} />
        <h2>{agent.name}</h2>
        <p>{agent.agency_name}</p>
        <div style={styles.cardInner}>
          <p><b>Mobile:</b> {agent.agent_phone || "Not saved"}</p>
          <p><b>Office:</b> {agent.main_phone || "Not saved"}</p>
          <p><b>Email:</b> {agent.agent_email || "Not saved"}</p>
          <p><b>Office Address:</b> {address || "Not saved"}</p>
        </div>
        <div style={styles.actionRow}>
          {(agent.agent_phone || agent.main_phone) && <button style={actionStyle("call")} onClick={openCall}>Call</button>}
          {agent.agent_phone && <a style={actionStyle("text")} href={`sms:${agent.agent_phone}`}>Text</a>}
          {address && <a style={actionStyle("map")} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Map</a>}
          {agent.agent_email && <button style={actionStyle("email")} onClick={emailAndLog}>Email</button>}
          <button style={actionStyle("edit")} onClick={() => startEdit(agent)}>Edit</button>
          <button style={actionStyle("caution")} onClick={() => moveToDoNotPursue(agent)}>Do Not Pursue</button>
          <button style={actionStyle("delete")} onClick={() => deleteAgent(agent)}>Delete</button>
        </div>
        <div style={styles.actionRow}>
          <button style={actionStyle("call")} onClick={() => startLog(agent, "Phone Call")}>Log Call</button>
          <button style={actionStyle("text")} onClick={() => startLog(agent, "Text Message")}>Log Text</button>
          <button style={actionStyle("neutral")} onClick={() => startLog(agent, "Office Stop In")}>Log Stop In</button>
          <button style={actionStyle("ask")} onClick={() => startLog(agent, "Referral Request")}>Referral Ask</button>
          <button style={actionStyle("won")} onClick={() => startLog(agent, "Referral Received")}>Referral Won</button>
        </div>
        {(cardPhotos?.front || cardPhotos?.back) && (
          <div style={styles.cardInner}>
            <h3>Business Card</h3>
            <div style={styles.cardPhotoGrid}>
              {cardPhotos.front && <img style={styles.cardPhotoPreview} src={cardPhotos.front} alt="Business card front" />}
              {cardPhotos.back && <img style={styles.cardPhotoPreview} src={cardPhotos.back} alt="Business card back" />}
            </div>
          </div>
        )}
        <div style={styles.cardInner}>
          <p><b>Company Type:</b> {agent.company_type || "Not set"}</p>
          <p><b>Role:</b> {agent.contact_role || "Not set"}</p>
          <p><b>Contact Origin:</b> {agent.referral_source || "Not set"}</p>
          <p><b>Trust Level:</b> {agent.relationship_strength || "Not set"}</p>
          <p><b>Introduced By:</b> {agent.introduced_by || "Not set"}</p>
          <p><b>Last Contact:</b> {agent.last_contact_date || "Not logged"}</p>
          <p><b>Next Follow Up:</b> {agent.next_follow_up_date || "No trigger"}</p>
          <p><b>Notes:</b> {agent.notes || "No notes yet"}</p>
        </div>
        <div style={styles.cardInner}>
          <h3>Activity Timeline</h3>
          {logs.length === 0 ? <p>No activity logged yet.</p> : logs.map((log) => <ActivityPreview key={log.id} item={log} />)}
        </div>
      </div>
    </div>
  );
}

function ReferralProfile({ referral, close, edit, markQueued, deleteReferral }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={actionStyle("neutral")} onClick={close}>Close</button>
        <SyncBadge status={referral.sync_status} />
        <h2>{referralCustomerName(referral)}</h2>
        <p>{referralAddress(referral)}</p>
        <div style={styles.cardInner}>
          <h3>Referral Attribution</h3>
          <p><b>Sent By:</b> {referral.sent_by_name || "Not set"}</p>
          <p><b>Agency:</b> {referral.agency_name || "Not set"}</p>
          <p><b>Agency Office:</b> {[referral.agency_office_address, referral.agency_city, referral.agency_state].filter(Boolean).join(", ") || "Not set"}</p>
          <p><b>Rep Phone:</b> {referral.agent_phone || referral.agency_phone || "Not saved"}</p>
          <p><b>Rep Email:</b> {referral.agent_email || "Not saved"}</p>
        </div>
        <div style={styles.cardInner}>
          <h3>Customer Intake</h3>
          <p><b>Customer:</b> {referralCustomerName(referral)}</p>
          <p><b>Phone:</b> {referral.customer_phone || "Not saved"}</p>
          <p><b>Email:</b> {referral.customer_email || "Not saved"}</p>
          <p><b>Property:</b> {referralAddress(referral) || "Not saved"}</p>
          <p><b>Notes:</b> {referral.referral_notes || "No notes"}</p>
        </div>
        <div style={styles.cardInner}>
          <h3>JobNimbus Sync Placeholder</h3>
          <p><b>Status:</b> {referral.sync_status}</p>
          <p>{referral.sync_message}</p>
          <p style={styles.sub}>Later this button will search or create the agency contact, create the customer contact, create the job, relate the records, and save JobNimbus IDs back to Avalanche.</p>
        </div>
        <div style={styles.actionRow}>
          <button style={actionStyle("sync")} onClick={() => markQueued(referral)}>Queue JobNimbus Sync</button>
          <button style={actionStyle("edit")} onClick={edit}>Edit</button>
          <button style={actionStyle("delete")} onClick={() => deleteReferral(referral)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ActivityPreview({ item }) {
  return <div style={styles.timelineItem}><b>{item.engagement_type}</b><p>{item.contact_name ? `${item.contact_name} · ${item.company_name}` : item.engagement_date}</p>{item.action_taken && <p><b>Action:</b> {item.action_taken}</p>}{item.notes && <p>{item.notes}</p>}{item.outcome && <p><b>Outcome:</b> {item.outcome}</p>}{item.next_action && <p><b>Next:</b> {item.next_action}</p>}</div>;
}

function CallChoiceModal({ agent, close, startLog }) {
  return <div style={styles.overlay}><div style={styles.sheet}><button style={actionStyle("neutral")} onClick={close}>Cancel</button><h2>Choose Number</h2><p>{agent.name} · {agent.agency_name}</p>{agent.agent_phone ? <a style={styles.callButton} href={`tel:${agent.agent_phone}`}>Call Mobile: {agent.agent_phone}</a> : <div style={styles.disabledBox}>No mobile phone saved</div>}{agent.main_phone ? <a style={styles.callButton} href={`tel:${agent.main_phone}`}>Call Office: {agent.main_phone}</a> : <div style={styles.disabledBox}>No office phone saved</div>}<button style={actionStyle("call", true)} onClick={() => { close(); startLog(agent, "Phone Call"); }}>Log Phone Call Notes</button></div></div>;
}

function ActivityLogModal({ agent, type, form, setForm, saveActivity, saving, close }) {
  function set(key, value) { setForm({ ...form, [key]: value }); }
  return <div style={styles.overlay}><div style={styles.sheet}><button style={actionStyle("neutral")} onClick={close}>Cancel</button><h2>{type}</h2><p>{agent.name} · {agent.agency_name}</p><form style={styles.form} onSubmit={saveActivity}>{type === "Office Stop In" ? <Select label="Action Taken" value={form.action_taken} options={["Coffee", "Brought Food", "Tacos", "Lunch Invite", "Dropped Marketing Material", "Met New Staff", "Other"]} onChange={(v) => set("action_taken", v)} /> : <Input label="Action Taken" value={form.action_taken} onChange={(v) => set("action_taken", v)} />}<Textarea label="Activity Notes" value={form.notes} onChange={(v) => set("notes", v)} /><Textarea label="Outcome" value={form.outcome} onChange={(v) => set("outcome", v)} /><Input label="Next Action" value={form.next_action} onChange={(v) => set("next_action", v)} /><button style={actionStyle("save", true)} disabled={saving}>{saving ? "Saving..." : "Save Activity"}</button></form></div></div>;
}

function EditModal({ form, setForm, cardPhotos, setCardPhotos, updateAgent, saving, close, nextFollowUp, today }) {
  return <div style={styles.overlay}><div style={styles.sheet}><button style={actionStyle("neutral")} onClick={close}>Cancel</button><h2>Edit Relationship Contact</h2><ContactForm form={form} setForm={setForm} cardPhotos={cardPhotos} setCardPhotos={setCardPhotos} onSubmit={updateAgent} saving={saving} nextFollowUp={nextFollowUp} today={today} buttonText="Update Relationship Contact" /></div></div>;
}

function ReferralEditModal({ form, setForm, agents, populateReferralSource, updateReferralLead, close }) {
  return <div style={styles.overlay}><div style={styles.sheet}><button style={actionStyle("neutral")} onClick={close}>Cancel</button><h2>Edit Referral Lead</h2><ReferralLeadForm form={form} setForm={setForm} agents={agents} populateReferralSource={(id) => populateReferralSource(id, setForm)} onSubmit={updateReferralLead} buttonText="Update Referral Lead" /></div></div>;
}

function ContactForm({ form, setForm, cardPhotos, setCardPhotos, onSubmit, saving, nextFollowUp, today, buttonText }) {
  function set(key, value) { setForm({ ...form, [key]: value }); }
  return <form style={styles.form} onSubmit={onSubmit}><Select label="Relationship Status" value={form.relationship_status} options={STATUSES} onChange={(v) => setForm({ ...form, relationship_status: v })} /><Input label="Company Name" value={form.agency_name} onChange={(v) => set("agency_name", v)} required /><Input label="First Name" value={form.agent_first_name} onChange={(v) => set("agent_first_name", v)} /><Input label="Last Name" value={form.agent_last_name} onChange={(v) => set("agent_last_name", v)} /><Input label="Mobile Phone" value={form.agent_phone} onChange={(v) => set("agent_phone", v)} /><Input label="Office Phone" value={form.main_phone} onChange={(v) => set("main_phone", v)} /><Input label="Email" value={form.agent_email} onChange={(v) => set("agent_email", v)} /><Input label="Office Address" value={form.address} onChange={(v) => set("address", v)} /><Input label="City" value={form.city} onChange={(v) => set("city", v)} /><Input label="State" value={form.state} onChange={(v) => set("state", v)} /><Select label="Company Type" value={form.company_type} options={COMPANY_TYPES} onChange={(v) => set("company_type", v)} /><DatalistInput label="Contact Role" value={form.contact_role} onChange={(v) => set("contact_role", v)} suggestions={CONTACT_ROLE_SUGGESTIONS} /><Select label="Contact Origin" value={form.referral_source} options={CONTACT_ORIGINS} onChange={(v) => set("referral_source", v)} /><Select label="Trust Level" value={form.relationship_strength} options={RELATIONSHIP_STRENGTH} onChange={(v) => set("relationship_strength", v)} /><BusinessCardUpload cardPhotos={cardPhotos} setCardPhotos={setCardPhotos} /><Input label="Introduced By" value={form.introduced_by} onChange={(v) => set("introduced_by", v)} /><Input type="date" label="Last Contact" value={form.last_contact_date} onChange={(v) => setForm({ ...form, last_contact_date: v })} /><Input type="date" label="Scheduled Follow Up" value={form.next_follow_up_date} onChange={(v) => set("next_follow_up_date", v)} /><Input label="Favorite Food / Drink" value={form.favorite_food} onChange={(v) => set("favorite_food", v)} /><Input label="Birthday" value={form.birthday} onChange={(v) => set("birthday", v)} /><Input label="Tags" value={form.tags} onChange={(v) => set("tags", v)} /><Textarea label="Memory Notes" value={form.notes} onChange={(v) => set("notes", v)} /><button style={actionStyle("save", true)} disabled={saving}>{saving ? "Saving..." : buttonText}</button></form>;
}

function ReferralLeadForm({ form, setForm, agents, populateReferralSource, onSubmit, buttonText }) {
  function set(key, value) { setForm({ ...form, [key]: value, updated_at: todayStatic() }); }
  const selectedAgent = agents.find((agent) => String(agent.id) === String(form.sent_by_id));
  return (
    <form style={styles.form} onSubmit={onSubmit}>
      <Section title="Referral Attribution" subtitle="Select the relationship contact that sent the customer lead.">
        <label style={styles.label}>Referral Sent By
          <select style={styles.input} value={form.sent_by_id || ""} onChange={(e) => populateReferralSource(e.target.value)}>
            <option value="">Select Relationship Contact</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} - {agent.agency_name}</option>)}
          </select>
        </label>
        {selectedAgent && (
          <div style={styles.cardInner}>
            <p><b>Agency:</b> {form.agency_name || "Not set"}</p>
            <p><b>Office:</b> {[form.agency_office_address, form.agency_city, form.agency_state].filter(Boolean).join(", ") || "Not set"}</p>
            <p><b>Rep:</b> {form.sent_by_name || "Not set"}</p>
            <p><b>Rep Phone:</b> {form.agent_phone || form.agency_phone || "Not saved"}</p>
            <p><b>Rep Email:</b> {form.agent_email || "Not saved"}</p>
          </div>
        )}
      </Section>

      <Section title="Customer Information" subtitle="This will later map to the JobNimbus customer contact.">
        <Input label="Customer First Name" value={form.customer_first_name} onChange={(v) => set("customer_first_name", v)} />
        <Input label="Customer Last Name" value={form.customer_last_name} onChange={(v) => set("customer_last_name", v)} />
        <Input label="Customer Phone" value={form.customer_phone} onChange={(v) => set("customer_phone", v)} />
        <Input label="Customer Email" value={form.customer_email} onChange={(v) => set("customer_email", v)} />
      </Section>

      <Section title="Property Address" subtitle="Address will later be used as the primary duplicate check before creating a JobNimbus contact/job.">
        <Input label="Address 1" value={form.property_address_1} onChange={(v) => set("property_address_1", v)} />
        <Input label="Address 2" value={form.property_address_2} onChange={(v) => set("property_address_2", v)} />
        <Input label="City" value={form.property_city} onChange={(v) => set("property_city", v)} />
        <Input label="State" value={form.property_state} onChange={(v) => set("property_state", v)} />
        <Input label="Zip" value={form.property_zip} onChange={(v) => set("property_zip", v)} />
      </Section>

      <Section title="Internal Notes" subtitle="Keep this limited to referral intake notes, not production workflow.">
        <Textarea label="Referral Notes" value={form.referral_notes} onChange={(v) => set("referral_notes", v)} />
      </Section>

      <Section title="JobNimbus Sync" subtitle="Placeholder is active for the leadership demo. Real API connection can be added later without redesigning the form.">
        <SyncBadge status={form.sync_status || "Not Synced"} />
        <p style={styles.sub}>{form.sync_message || "Ready for JobNimbus integration setup"}</p>
        <div style={styles.disabledBox}>Sync button will be activated after JobNimbus API access is connected.</div>
      </Section>

      <button style={actionStyle("save", true)}>{buttonText}</button>
    </form>
  );
}

function BusinessCardUpload({ cardPhotos, setCardPhotos }) {
  function resizeImage(file, callback) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => callback(reader.result);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function handleFile(side, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    resizeImage(file, (compressedImage) => {
      setCardPhotos({ ...(cardPhotos || EMPTY_CARD_PHOTOS), [side]: compressedImage });
    });
  }

  function clearPhoto(side) {
    setCardPhotos({ ...(cardPhotos || EMPTY_CARD_PHOTOS), [side]: "" });
  }

  return (
    <Section title="Business Card Photos" subtitle="Upload or take a front and back photo. Images are compressed before saving.">
      <div style={styles.cardPhotoGrid}>
        <CardPhotoPicker label="Front of Card" value={cardPhotos?.front} onChange={(file) => handleFile("front", file)} onClear={() => clearPhoto("front")} />
        <CardPhotoPicker label="Back of Card" value={cardPhotos?.back} onChange={(file) => handleFile("back", file)} onClear={() => clearPhoto("back")} />
      </div>
    </Section>
  );
}

function CardPhotoPicker({ label, value, onChange, onClear }) {
  return (
    <div style={styles.cardPhotoBox}>
      <b>{label}</b>
      {value ? <img style={styles.cardPhotoPreview} src={value} alt={label} /> : <div style={styles.cardPhotoEmpty}>No photo uploaded</div>}
      <input style={styles.fileInput} type="file" accept="image/jpeg,image/jpg,image/png" capture="environment" onChange={(e) => onChange(e.target.files?.[0])} />
      {value && <button type="button" style={actionStyle("caution", true)} onClick={onClear}>Remove Photo</button>}
    </div>
  );
}

function Playbook() {
  return <Section title="Playbook" subtitle="Current architecture logic"><p><b>Relationship Contact:</b> agents, realtors, property managers, vendors, inspectors, and other referral relationships.</p><p><b>Referral Lead:</b> customer/job intake that came through a relationship contact.</p><p><b>New Prospect:</b> 15+ day relationship touch.</p><p><b>Needs Follow Up:</b> 15+ day relationship touch.</p><p><b>Warm Relationship:</b> 30+ day relationship touch.</p><p><b>Maintenance Relationship:</b> 60+ day relationship touch.</p><p><b>Active Referral Partner:</b> no automated sales trigger.</p><p><b>VIP Referral Partner:</b> 45+ day soft relationship touch.</p><p><b>JobNimbus Sync:</b> staged placeholder for now. Later it will create/search agency contact, customer contact, job, relationships, and store JobNimbus IDs.</p></Section>;
}

function Input({ label, value, onChange, required = false, type = "text" }) {
  return <label style={styles.label}>{label}<input style={styles.input} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} /></label>;
}

function DatalistInput({ label, value, onChange, suggestions }) {
  const listId = "contact-role-options";
  return <label style={styles.label}>{label}<input style={styles.input} list={listId} value={value || ""} onChange={(e) => onChange(e.target.value)} /><datalist id={listId}>{suggestions.map((item) => <option key={item} value={item} />)}</datalist></label>;
}

function Textarea({ label, value, onChange }) {
  return <label style={styles.label}>{label}<textarea style={styles.textarea} value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, options, onChange }) {
  return <label style={styles.label}>{label}<select style={styles.input} value={value || ""} onChange={(e) => onChange(e.target.value)}>{options.map((x) => <option key={x}>{x}</option>)}</select></label>;
}

function todayStatic() {
  return new Date().toISOString().split("T")[0];
}

function daysUntilDateFromToday(dateText) {
  if (!dateText) return null;
  const a = new Date(todayStatic() + "T00:00:00");
  const b = new Date(dateText + "T00:00:00");
  return Math.ceil((b - a) / 86400000);
}

const styles = {
  app: { minHeight: "100vh", background: COLORS.appBg, color: COLORS.text, fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
  screen: { maxWidth: 900, margin: "0 auto", padding: "12px 12px 90px" },
  header: { position: "sticky", top: 0, background: COLORS.cardBg, borderRadius: 18, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10, border: `1px solid ${COLORS.border}` },
  brand: { color: COLORS.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  h1: { margin: 0, color: COLORS.text },
  badge: { display: "inline-block", borderRadius: 999, padding: "8px 12px", fontWeight: 900, border: "1px solid", marginTop: 8, marginBottom: 8 },
  message: { background: COLORS.innerBg, padding: 12, borderRadius: 14, marginTop: 12, border: `1px solid ${COLORS.border}` },
  stack: { display: "flex", flexDirection: "column", gap: 12, marginTop: 12 },
  card: { background: COLORS.cardBg, padding: 14, borderRadius: 18, marginTop: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 12px 28px rgba(0,0,0,.18)" },
  cardInner: { background: COLORS.innerBg, padding: 12, borderRadius: 14, marginTop: 12, border: `1px solid ${COLORS.border}` },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  summaryCard: { background: COLORS.innerBg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderLeft: "5px solid #38bdf8", borderRadius: 14, padding: 12, textAlign: "left" },
  tiles: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  tile: { background: COLORS.cardBg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 14, textAlign: "left" },
  sub: { color: COLORS.muted },
  row: { background: COLORS.innerBg, padding: 12, borderRadius: 16, display: "flex", flexDirection: "column", gap: 4, border: `1px solid ${COLORS.border}`, cursor: "pointer" },
  softRow: { background: "#2f2a12", padding: 12, borderRadius: 16, display: "flex", flexDirection: "column", gap: 4, border: "1px solid #facc15" },
  input: { width: "100%", marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, outlineColor: "#38bdf8" },
  textarea: { width: "100%", minHeight: 90, marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, outlineColor: "#38bdf8" },
  label: { display: "block", fontWeight: 800, color: COLORS.secondary },
  form: { background: COLORS.cardBg, padding: 14, borderRadius: 18, marginTop: 12, border: `1px solid ${COLORS.border}` },
  modeGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  modeButton: { padding: 14, borderRadius: 14, fontWeight: 900, border: `1px solid ${COLORS.border}`, background: COLORS.innerBg, color: COLORS.secondary },
  modeButtonOn: { padding: 14, borderRadius: 14, fontWeight: 900, border: `1px solid ${ACTION_COLORS.sync.border}`, background: ACTION_COLORS.sync.background, color: ACTION_COLORS.sync.color },
  nav: { position: "fixed", bottom: 8, left: "50%", transform: "translateX(-50%)", width: "min(96vw, 700px)", background: COLORS.cardBg, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, padding: 8, borderRadius: 22, border: `1px solid ${COLORS.border}`, boxShadow: "0 12px 30px rgba(0,0,0,.35)" },
  navButton: { padding: 10, borderRadius: 14, background: "transparent", color: COLORS.muted, border: 0, fontWeight: 900, fontSize: 12 },
  navOn: { padding: 10, borderRadius: 14, background: COLORS.text, color: "#020617", border: 0, fontWeight: 900, fontSize: 12 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12, zIndex: 50 },
  sheet: { background: COLORS.cardBg, width: "min(100%, 650px)", maxHeight: "90vh", overflow: "auto", padding: 16, borderRadius: "24px 24px 12px 12px", border: `1px solid ${COLORS.border}`, boxShadow: "0 -18px 45px rgba(0,0,0,.42)" },
  timelineItem: { borderTop: `1px solid ${COLORS.border}`, paddingTop: 10, marginTop: 10, color: COLORS.secondary },
  cardPhotoGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  cardPhotoBox: { background: COLORS.innerBg, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 12 },
  cardPhotoEmpty: { minHeight: 120, border: `1px dashed ${COLORS.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted, marginTop: 10, marginBottom: 10 },
  cardPhotoPreview: { width: "100%", borderRadius: 12, border: `1px solid ${COLORS.border}`, marginTop: 10, marginBottom: 10, objectFit: "cover" },
  fileInput: { width: "100%", marginTop: 8, marginBottom: 8, color: COLORS.secondary },
  callButton: { display: "block", background: ACTION_COLORS.call.background, color: ACTION_COLORS.call.color, border: `1px solid ${ACTION_COLORS.call.border}`, padding: 14, borderRadius: 14, marginTop: 10, textDecoration: "none", textAlign: "center", fontWeight: 900 },
  disabledBox: { background: COLORS.innerBg, color: COLORS.muted, padding: 14, borderRadius: 14, marginTop: 10, textAlign: "center", border: `1px solid ${COLORS.border}` },
  actionRow: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  actionRowSmall: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  statusLine: { display: "block", marginTop: 8, marginBottom: 8 },
  metaStack: { display: "flex", flexDirection: "column", gap: 5, marginTop: 6, color: COLORS.secondary }
};
