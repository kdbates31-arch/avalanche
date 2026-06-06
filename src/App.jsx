import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const CC_EMAIL = "kristopher.bates@coolroofs.co";
const CARD_STORAGE_KEY = "avalanche_business_card_photos_v1";
const BUSINESS_CARD_BUCKET = "business-cards";

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


const REFERRAL_STATUSES = [
  "New Referral",
  "Working",
  "Estimate Process",
  "Contract Signed",
  "Lost",
  "Archived"
];

const LOST_REASONS = [
  "Insurance Denied",
  "Delayed Project",
  "Went With Competitor",
  "Financial Reasons",
  "Other - No Drip"
];

const EXPORT_TYPES = [
  { value: "referrals", label: "Referral Leads / Homeowners" },
  { value: "contacts", label: "Relationship Contacts" },
  { value: "activity", label: "Activity Logs" },
  { value: "everything", label: "All Core Data" }
];

const EXPORT_DATE_FIELDS = [
  { value: "updated_at", label: "Last Updated Date" },
  { value: "created_at", label: "Created Date" },
  { value: "status_date", label: "Status / Follow-Up Date" },
  { value: "birthday", label: "Birthday" }
];

const EXPORT_COLUMN_PRESETS = [
  { value: "mailing", label: "Mailing / Card Service" },
  { value: "email", label: "Email Service" },
  { value: "phone", label: "Phone / Call List" },
  { value: "pipeline", label: "Pipeline Report" },
  { value: "full", label: "Full Data Backup" }
];

const EMPTY_EXPORT_FORM = {
  export_type: "referrals",
  date_field: "updated_at",
  start_date: "",
  end_date: "",
  column_preset: "mailing",
  referral_status: "All",
  lost_reason: "All",
  referral_source: "All",
  relationship_status: "All",
  company_type: "All",
  contact_origin: "All",
  trust_level: "All",
  require_email: false,
  require_phone: false,
  require_address: false,
  birthday_only: false,
  reason: "Christmas Cards"
};

const REFERRAL_STATUS_COLORS = {
  "New Referral": { background: "#075985", color: "#bae6fd", border: "#38bdf8" },
  Working: { background: "#713f12", color: "#fde68a", border: "#facc15" },
  "Estimate Process": { background: "#1e3a8a", color: "#bfdbfe", border: "#60a5fa" },
  "Contract Signed": { background: "#14532d", color: "#bbf7d0", border: "#22c55e" },
  Lost: { background: "#7f1d1d", color: "#fecaca", border: "#ef4444" },
  Archived: { background: "#374151", color: "#d1d5db", border: "#6b7280" }
};

function addDaysStatic(dateText, count) {
  const d = dateText ? new Date(dateText + "T00:00:00") : new Date();
  d.setDate(d.getDate() + count);
  return d.toISOString().split("T")[0];
}

function lostDripStep(referral) {
  const step = String(referral?.lost_drip_step || "30");
  if (step === "Quarterly") return "Evergreen";
  return ["30", "60", "90", "Evergreen"].includes(step) ? step : "30";
}

function lostDripLabel(referral) {
  const step = lostDripStep(referral);
  return step === "Evergreen" ? "60-Day Touch" : `${step}-Day Email`;
}

function nextLostDripStep(currentStep) {
  if (currentStep === "30") return "60";
  if (currentStep === "60") return "90";
  return "Evergreen";
}

function nextLostDripDateAfterSend(currentStep, baseDate) {
  if (currentStep === "30") return addDaysStatic(baseDate, 30);
  if (currentStep === "60") return addDaysStatic(baseDate, 30);
  return addDaysStatic(baseDate, 60);
}

function homeownerEmailSignature() {
  return `Kris Bates
Roofing and Commercial Specialist
Cool Roofs

📞 (M) 512-988-2731
✉️ kris.bates@coolroofs.co
🌐 www.coolroofs.co/location/austin/
📍 2121 E 6th St #201, Austin, TX 78702

CONFIDENTIALITY/PRIVACY NOTICE: This email, including any attachments, may contain personal, private, and confidential information intended solely for use by the individual to whom it is addressed. If you are not the intended recipient, please be advised that any dissemination, distribution, or copying of this message is strictly prohibited. If you have received this message in error, please notify the sender immediately by email and delete it from your system.`;
}

function normalizedLostReason(referral) {
  const reason = String(referral?.lost_reason || "Insurance Denied").trim();
  return LOST_REASONS.includes(reason) ? reason : "Insurance Denied";
}

function lostReasonHasDrip(reason) {
  return reason && reason !== "Other - No Drip";
}

function lostDripEmailSubject(referral) {
  const step = lostDripStep(referral);
  const reason = normalizedLostReason(referral);

  if (step === "Evergreen") return "Your Cool Roofs Roofer";

  if (reason === "Insurance Denied") {
    if (step === "30") return "Just checking in";
    if (step === "60") return "Hey, it’s me again";
    return "Just saying hello";
  }

  if (reason === "Delayed Project") {
    if (step === "30") return "Your Project Crossed My Mind";
    if (step === "60") return "Still thinking about that roof";
    return "Three months already?";
  }

  if (reason === "Went With Competitor") {
    if (step === "30") return "Hope everything worked out";
    if (step === "60") return "It’s me again from Cool Roofs";
    return "One last follow up from Cool Roofs";
  }

  if (reason === "Financial Reasons") {
    if (step === "30") return "Wanted to stay in touch";
    if (step === "60") return "It’s me again from Cool Roofs";
    return "One more note from Cool Roofs";
  }

  return "Your Cool Roofs Roofer";
}

function lostDripEmailBody(referral) {
  const firstName = referral?.customer_first_name || "there";
  const step = lostDripStep(referral);
  const reason = normalizedLostReason(referral);
  const signature = homeownerEmailSignature();

  if (step === "Evergreen") {
    return `Hi ${firstName},

Hope you are well.

Blessings to you and your family.

Kind Regards,

${signature}`;
  }

  if (reason === "Insurance Denied") {
    if (step === "30") {
      return `Hi ${firstName},

I was doing one of my monthly reviews this week and your property came to mind.

As a habit, I like to revisit past projects and situations from time to time. Sometimes a fresh perspective, a new idea, or simply a little time passing can create options that weren't obvious before.

I know we put quite a bit of effort into trying to find a path forward with your roof, and unfortunately the insurance outcome didn't end up where any of us had hoped. After going through that process, I completely understand if talking about roofing was the last thing you wanted to do.

I didn't reach out because I have some magic solution or because I'm trying to sell you something. I simply wanted to stay in touch and let you know I haven't forgotten about your situation.

The issues we discussed likely haven't gone away, and if there ever comes a time when the timing feels right to revisit them, give me a call. I'd be glad to pick up the conversation where we left off and see if there might be a path forward.

In the meantime, I hope everything has been going well for you and your family.

Take care,

${signature}`;
    }

    if (step === "60") {
      return `Hi ${firstName},

Hey, it’s me again.

I’d be remiss if my follow-up game wasn’t at least somewhat on point. Hopefully I’m not intruding. I just wanted to stay on your radar.

I know we already went through quite a bit trying to figure out the best path forward with your roof. If and when it becomes time to revisit those repairs, I’m here and happy to be of value however I can.

No pressure at all. Just wanted to check in and let you know I’m still around if you need me.

Hope you and the family are doing well.

${signature}`;
    }

    return `Hi ${firstName},

Just saying hello.

Hard to believe it's been a few months already since we last talked. Every now and then I think about some of the homeowners I've worked with over the years and wonder how things ended up working out for them. Your name crossed my mind, so I figured I'd reach out.

I know the insurance route didn't get us where we wanted to go, and chances are life has kept you busy with plenty of other things since then.

I just wanted to let you know that if those repairs are still sitting on the "one of these days" list, I'm still here. No pressure, no sales pitch, and no expectation that you need anything right now.

Just wanted to say hello and remind you that you haven't been forgotten.

Hope all is well with you and your family.

${signature}`;
  }

  if (reason === "Delayed Project") {
    if (step === "30") {
      return `Hi ${firstName},

Your project crossed my mind the other day, so I figured I'd reach out.

When we last talked, it seemed like the roof was still something that needed attention, but the timing just wasn't quite right. I completely understood that then, and I still do now.

One thing I've noticed over the years is that time has a way of moving faster than any of us expect. The projects we plan to get around to in a few weeks somehow turn into a few months before we know it.

I don't say that because I'm trying to create urgency. It's simply something I've seen happen with a lot of good people who have a hundred other priorities competing for their attention.

If the timing is starting to feel a little better than it did when we last spoke, I'd be happy to pick the conversation back up wherever we left it.

If not, no worries at all. I just wanted to say hello and let you know I'm still here if you need me.

Hope things are going well for you and your family.

Kind Regards,

${signature}`;
    }

    if (step === "60") {
      return `Hi ${firstName},

It's me again.

Please pardon my consistency. If my follow up game isn't on point, then I'm not doing my job.

I know the timing still wasn't quite right the last time we spoke, and that's perfectly okay. Life has a way of filling every available space on the calendar.

I also know roofing projects rarely get better with age. They just patiently wait for the right time to be dealt with.

So this is simply my friendly reminder that when that time comes, I'm here.

No pressure. Just staying on your radar and letting you know I haven't forgotten about you.

Hope things are going well for you and your family.

Kind Regards,

${signature}`;
    }

    return `Hi ${firstName},

Hard to believe it's already been a few months.

At this point, I feel like I'd be letting you down if I didn't at least send one more friendly reminder.

When we last spoke, the roof wasn't really a "no," it was more of a "not right now." I completely understood that then, and I still do.

My guess is life has stayed busy, and the roof has continued sitting patiently in the background waiting for its turn.

Whenever that turn comes, give me a call. I'd be happy to pick the conversation back up wherever we left it and see what makes sense today.

Until then, I'm simply staying on your radar and wishing you and your family all the best.

Kind Regards,

${signature}`;
  }

  if (reason === "Went With Competitor") {
    if (step === "30") {
      return `Hi ${firstName},

Hope you're doing well.

Just wanted to say thank you again for the opportunity to meet with you and discuss your project.

I hope everything worked out the way you hoped it would. If I can ever be of help down the road, don't hesitate to reach out.

Wishing you and your family all the best.

Kind Regards,

${signature}`;
    }

    if (step === "60") {
      return `Hi ${firstName},

It's me again.

Please pardon my consistency. If my follow up game isn't on point, then I'm not doing my job.

By now, you've probably had enough time to get a feel for how the project went and whether everything came together the way you hoped.

If it did, that's great and I'm genuinely happy for you.

If it didn't, and there's anything I can do to help get things back on track, don't hesitate to reach out.

Wishing you and your family all the best.

Kind Regards,

${signature}`;
    }

    return `Hi ${firstName},

It's me one more time.

At this point, I feel like I've earned the right to say my follow up game is pretty solid.

By now, I'm guessing your project is either behind you or close to it.

Either way, I wanted to leave the door open. If you ever need a repair, a second opinion, or help with something down the road, don't hesitate to reach out.

No pressure. Just wanted you to know I'm here if you ever need me.

Wishing you and your family all the best.

Kind Regards,

${signature}`;
  }

  if (reason === "Financial Reasons") {
    if (step === "30") {
      return `Hi ${firstName},

I hope you and your family are doing well.

I know when we last talked, moving forward just wasn't in the cards at that moment, and I completely understood that.

I just wanted to stay in touch and let you know I'm still here if circumstances change or if you'd ever like to revisit the conversation.

No pressure at all. Just staying on your radar and wishing you and your family the very best.

Kind Regards,

${signature}`;
    }

    if (step === "60") {
      return `Hi ${firstName},

It's me again.

Please pardon my consistency. If my follow up game isn't on point, then I'm not doing my job.

A couple of months have gone by since we last talked, and I've learned that life has a way of changing plans, priorities, and possibilities when we least expect it.

If anything has changed on your end and you'd like to revisit the conversation, I'd be happy to pick up where we left off.

If not, no worries at all. Just staying on your radar and wishing you and your family the very best.

Kind Regards,

${signature}`;
    }

    return `Hi ${firstName},

It's me one more time.

Hard to believe three months have already gone by.

I know life has a way of keeping us all moving from one priority to the next, so I simply wanted to leave the door open one last time before I quit bothering you.

If there ever comes a point where you'd like to revisit the conversation, I'd be happy to hear from you.

Until then, I'm wishing you and your family nothing but the best.

Kind Regards,

${signature}`;
  }

  return `Hi ${firstName},

Hope you are well.

Blessings to you and your family.

Kind Regards,

${signature}`;
}

function lostDripEmailHref(referral) {
  if (!referral?.customer_email) return "#";
  return `mailto:${referral.customer_email}?subject=${encodeURIComponent(lostDripEmailSubject(referral))}&body=${encodeURIComponent(lostDripEmailBody(referral))}`;
}

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
  referral_status: "New Referral",
  lost_reason: "",
  lost_drip_last_sent_date: "",
  lost_drip_next_date: "",
  lost_drip_step: "30",
  sync_status: "Not Synced",
  sync_message: "",
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


function ReferralStatusBadge({ status }) {
  const color = REFERRAL_STATUS_COLORS[status] || REFERRAL_STATUS_COLORS["New Referral"];
  return <span style={{ ...styles.badge, ...color }}>{status || "New Referral"}</span>;
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

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl || "").split(",");
  if (parts.length < 2) return null;
  const meta = parts[0] || "";
  const base64 = parts[1] || "";
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

async function uploadBusinessCardImage(value, folder, side) {
  if (!value) return { url: "" };

  if (!isDataUrl(value)) {
    return { url: value };
  }

  const blob = dataUrlToBlob(value);
  if (!blob) throw new Error("Could not prepare business card photo for upload.");

  const safeFolder = String(folder || "contact").replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${side}.jpg`;

  const { error } = await supabase.storage
    .from(BUSINESS_CARD_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(`Business card ${side} upload failed for bucket ${BUSINESS_CARD_BUCKET}: ${error.message}. Confirm the business-cards bucket exists, is public, and has insert/select policies for anon.`);

  const { data } = supabase.storage.from(BUSINESS_CARD_BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl || "";
  if (!publicUrl) throw new Error(`Business card ${side} uploaded but no public URL was returned.`);
  return { url: publicUrl };
}

async function uploadBusinessCardPhotos(cardPhotos, folder) {
  const currentFront = cardPhotos?.front || "";
  const currentBack = cardPhotos?.back || "";

  const front = currentFront ? await uploadBusinessCardImage(currentFront, folder, "front") : { url: "" };
  const back = currentBack ? await uploadBusinessCardImage(currentBack, folder, "back") : { url: "" };

  return { front, back };
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/[ ]+/g, " ");
}

function officeKeyFromAgent(agent) {
  return [agent.agency_name, agent.address, agent.city, agent.state].map(normalizeText).join("|");
}


function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

function dateInRange(dateText, startDate, endDate) {
  if (!dateText) return false;
  const value = String(dateText).slice(0, 10);
  if (startDate && value < startDate) return false;
  if (endDate && value > endDate) return false;
  return true;
}

function compactDate(value) {
  return String(value || "").replace(/[^0-9]/g, "") || "all";
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
  const [exportLogs, setExportLogs] = useState([]);
  const [exportForm, setExportForm] = useState({ ...EMPTY_EXPORT_FORM });
  const [agentForm, setAgentForm] = useState({ ...EMPTY_AGENT });
  const [agentCardPhotos, setAgentCardPhotos] = useState({ ...EMPTY_CARD_PHOTOS });
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
  const [selectedReferralSource, setSelectedReferralSource] = useState(null);
  const [referralArchiveSearch, setReferralArchiveSearch] = useState("");
  const [editingReferral, setEditingReferral] = useState(null);
  const [pendingLostReferral, setPendingLostReferral] = useState(null);
  const [callAgent, setCallAgent] = useState(null);
  const [logAgent, setLogAgent] = useState(null);
  const [logType, setLogType] = useState("Phone Call");
  const [logForm, setLogForm] = useState({ ...EMPTY_LOG });

  useEffect(() => {
    loadAgents();
    loadReferrals();
    loadExportLogs();
  }, []);

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  function resetView() {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function goToTab(nextTab) {
    setTab(nextTab);
    setTimeout(resetView, 0);
  }

  async function loadReferrals() {
    const { data, error } = await supabase
      .from("referral_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load referral leads: " + error.message);
      setReferrals([]);
      return;
    }

    setReferrals(data || []);
  }


  async function loadExportLogs() {
    const { data, error } = await supabase
      .from("export_logs")
      .select("*")
      .order("exported_at", { ascending: false })
      .limit(12);

    if (error) {
      setExportLogs([]);
      return;
    }

    setExportLogs(data || []);
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
      const payload = { ...agentForm, last_contact_date: last, next_follow_up_date: next, business_card_front: "", business_card_back: "" };

      const { data: insertedRows, error } = await supabase
        .from("agencies")
        .insert([payload])
        .select("id");

      if (error) {
        setMessage("Save failed: " + error.message);
        return;
      }

      const newId = insertedRows && insertedRows[0] ? insertedRows[0].id : null;

      let finalSaveMessage = "Relationship Contact saved.";
      if (newId && (agentCardPhotos.front || agentCardPhotos.back)) {
        try {
          const uploadedPhotos = await uploadBusinessCardPhotos(agentCardPhotos, String(newId));
          const { error: photoUpdateError } = await supabase
            .from("agencies")
            .update({
              business_card_front: uploadedPhotos.front.url || "",
              business_card_back: uploadedPhotos.back.url || ""
            })
            .eq("id", newId);

          if (photoUpdateError) {
            finalSaveMessage = "Contact saved, but business card photo links failed: " + photoUpdateError.message;
          } else {
            finalSaveMessage = "Relationship Contact saved with business card photos.";
          }
        } catch (photoError) {
          finalSaveMessage = "Contact saved, but business card photos failed: " + (photoError?.message || String(photoError));
        }
      }

      setAgentCardPhotos({ ...EMPTY_CARD_PHOTOS });
      setAgentForm({ ...EMPTY_AGENT });
      await loadAgents();
      setMessage(finalSaveMessage);
      goToTab("mission");
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

  async function saveReferralLead(e) {
    e.preventDefault();
    setMessage("");

    if (!referralForm.sent_by_id) return setMessage("Select who sent the referral.");
    if (!String(referralForm.customer_first_name || "").trim() && !String(referralForm.customer_last_name || "").trim()) return setMessage("Customer first or last name is required.");
    if (!String(referralForm.property_address_1 || "").trim()) return setMessage("Property address is required.");

    setSaving(true);

    try {
      const now = today();
      const lead = {
        id: makeId(),
        sent_by_id: String(referralForm.sent_by_id || ""),
        sent_by_name: referralForm.sent_by_name || "",
        agency_name: referralForm.agency_name || "",
        agency_office_address: referralForm.agency_office_address || "",
        agency_city: referralForm.agency_city || "",
        agency_state: referralForm.agency_state || "TX",
        agency_phone: referralForm.agency_phone || "",
        agent_phone: referralForm.agent_phone || "",
        agent_email: referralForm.agent_email || "",
        customer_first_name: referralForm.customer_first_name || "",
        customer_last_name: referralForm.customer_last_name || "",
        customer_phone: referralForm.customer_phone || "",
        customer_email: referralForm.customer_email || "",
        property_address_1: referralForm.property_address_1 || "",
        property_address_2: referralForm.property_address_2 || "",
        property_city: referralForm.property_city || "",
        property_state: referralForm.property_state || "TX",
        property_zip: referralForm.property_zip || "",
        referral_notes: referralForm.referral_notes || "",
        referral_status: referralForm.referral_status || "New Referral",
        lost_reason: "",
        lost_drip_step: null,
        lost_drip_next_date: null,
        lost_drip_last_sent_date: null,
        created_at: now,
        updated_at: now
      };

      const { error } = await supabase
        .from("referral_leads")
        .insert([lead]);

      if (error) {
        setMessage("Referral Lead save failed: " + error.message);
        return;
      }

      setReferralForm({ ...EMPTY_REFERRAL, created_at: today(), updated_at: today(), referral_status: "New Referral" });
      setAddMode("relationship");
      setSelectedReferralSource(null);
      setReferrals((current) => [lead, ...current.filter((item) => item.id !== lead.id)]);
      await loadReferrals();
      goToTab("mission");
      setMessage("Referral Lead saved.");
    } catch (err) {
      setMessage("Referral Lead save failed unexpectedly: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  async function updateReferralLead(e) {
    e.preventDefault();
    if (!editingReferral) return;
    setSaving(true);
    setMessage("");

    try {
      const status = editingReferral.referral_status || "New Referral";
      const payload = {
        sent_by_id: editingReferral.sent_by_id || "",
        sent_by_name: editingReferral.sent_by_name || "",
        agency_name: editingReferral.agency_name || "",
        agency_office_address: editingReferral.agency_office_address || "",
        agency_city: editingReferral.agency_city || "",
        agency_state: editingReferral.agency_state || "TX",
        agency_phone: editingReferral.agency_phone || "",
        agent_phone: editingReferral.agent_phone || "",
        agent_email: editingReferral.agent_email || "",
        customer_first_name: editingReferral.customer_first_name || "",
        customer_last_name: editingReferral.customer_last_name || "",
        customer_phone: editingReferral.customer_phone || "",
        customer_email: editingReferral.customer_email || "",
        property_address_1: editingReferral.property_address_1 || "",
        property_address_2: editingReferral.property_address_2 || "",
        property_city: editingReferral.property_city || "",
        property_state: editingReferral.property_state || "TX",
        property_zip: editingReferral.property_zip || "",
        referral_notes: editingReferral.referral_notes || "",
        referral_status: status,
        updated_at: today()
      };

      if (status === "Lost") {
        const reason = editingReferral.lost_reason || "Insurance Denied";
        payload.lost_reason = reason;
        if (lostReasonHasDrip(reason)) {
          payload.lost_drip_step = editingReferral.lost_drip_step || "30";
          payload.lost_drip_next_date = editingReferral.lost_drip_next_date || addDays(today(), 30);
          payload.lost_drip_last_sent_date = editingReferral.lost_drip_last_sent_date || null;
        } else {
          payload.lost_drip_step = null;
          payload.lost_drip_next_date = null;
          payload.lost_drip_last_sent_date = null;
        }
      } else {
        payload.lost_reason = "";
        payload.lost_drip_step = null;
        payload.lost_drip_next_date = null;
        payload.lost_drip_last_sent_date = null;
      }

      const { data, error } = await supabase
        .from("referral_leads")
        .update(payload)
        .eq("id", editingReferral.id)
        .select("*")
        .single();

      if (error) {
        setMessage("Referral Lead update failed: " + error.message);
        return;
      }

      if (!data) {
        setMessage("Referral Lead update failed: no matching referral record was found.");
        return;
      }

      setEditingReferral(null);
      setSelectedReferral(null);
      await loadReferrals();
      resetFilters();
      goToTab("referrals");
      setMessage("Referral Lead updated.");
    } catch (err) {
      setMessage("Referral Lead update failed unexpectedly: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  async function updateReferralStatus(referral, nextStatus) {
    if (!referral) return;

    if (nextStatus === "Lost") {
      setPendingLostReferral(referral);
      return;
    }

    const updates = {
      referral_status: nextStatus,
      lost_reason: "",
      lost_drip_next_date: null,
      lost_drip_last_sent_date: null,
      lost_drip_step: null,
      updated_at: today()
    };

    const { error } = await supabase
      .from("referral_leads")
      .update(updates)
      .eq("id", referral.id);

    if (error) {
      setMessage("Referral status update failed: " + error.message);
      return;
    }

    setSelectedReferral(null);
    await loadReferrals();
    goToTab("referrals");
    setMessage(`Referral marked ${nextStatus}.`);
  }

  async function finalizeLostReferral(referral, reason) {
    if (!referral) return;
    const finalReason = LOST_REASONS.includes(reason) ? reason : "Insurance Denied";
    const updates = {
      referral_status: "Lost",
      lost_reason: finalReason,
      lost_drip_last_sent_date: null,
      updated_at: today()
    };

    if (lostReasonHasDrip(finalReason)) {
      updates.lost_drip_step = "30";
      updates.lost_drip_next_date = addDays(today(), 30);
    } else {
      updates.lost_drip_step = null;
      updates.lost_drip_next_date = null;
    }

    const { error } = await supabase
      .from("referral_leads")
      .update(updates)
      .eq("id", referral.id);

    if (error) {
      setMessage("Referral status update failed: " + error.message);
      return;
    }

    setPendingLostReferral(null);
    setSelectedReferral(null);
    await loadReferrals();
    goToTab("referrals");
    setMessage(lostReasonHasDrip(finalReason) ? "Referral moved to Lost. 30-day follow-up date created." : "Referral moved to Lost with no automatic drip campaign.");
  }

  async function sendLostDripEmail(referral) {
    if (!referral?.customer_email) {
      setMessage("No customer email saved for this lost referral.");
      return;
    }

    const now = today();
    const currentStep = lostDripStep(referral);
    const nextStep = nextLostDripStep(currentStep);
    const nextDate = nextLostDripDateAfterSend(currentStep, now);
    const { error } = await supabase
      .from("referral_leads")
      .update({ lost_drip_last_sent_date: now, lost_drip_next_date: nextDate, lost_drip_step: nextStep, updated_at: now })
      .eq("id", referral.id);

    if (error) {
      setMessage("Lost follow-up email opened, but drip date update failed: " + error.message);
    } else {
      const currentLabel = currentStep === "Evergreen" ? "60-day stay-in-touch" : `${currentStep}-day`;
      const nextLabel = nextStep === "Evergreen" ? "60-day stay-in-touch" : `${nextStep}-day`;
      setMessage(`${currentLabel} lost follow-up email opened. Next ${nextLabel} follow-up date updated.`);
      await loadReferrals();
    }

    window.location.href = lostDripEmailHref(referral);
  }

  async function archiveReferral(referral) {
    const confirmed = window.confirm("Archive this Referral Lead? It will stay in Supabase but leave the active pipeline.");
    if (!confirmed) return;
    await updateReferralStatus(referral, "Archived");
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
      const { id, name, days, history, business_card_front, business_card_back, ...payload } = editingAgent;
      payload.last_contact_date = payload.last_contact_date || null;
      payload.next_follow_up_date = payload.next_follow_up_date || null;

      const { error } = await supabase.from("agencies").update(payload).eq("id", editingAgent.id);

      if (error) {
        setMessage("Update failed: " + error.message);
        return;
      }

      let photoMessage = "";
      try {
        const existingFront = editingAgent.business_card_front || "";
        const existingBack = editingAgent.business_card_back || "";
        const nextFrontValue = editingCardPhotos?.front || "";
        const nextBackValue = editingCardPhotos?.back || "";
        const photosChanged = nextFrontValue !== existingFront || nextBackValue !== existingBack;

        if (photosChanged) {
          const uploadedPhotos = await uploadBusinessCardPhotos(editingCardPhotos, String(editingAgent.id || "contact"));
          const finalFront = uploadedPhotos.front.url || "";
          const finalBack = uploadedPhotos.back.url || "";

          const { error: photoUpdateError } = await supabase
            .from("agencies")
            .update({ business_card_front: finalFront, business_card_back: finalBack })
            .eq("id", editingAgent.id);

          if (photoUpdateError) throw photoUpdateError;
        }
      } catch (photoError) {
        photoMessage = " Contact updated, but business card photos did not save: " + (photoError?.message || String(photoError));
      }

      const finalUpdateMessage = photoMessage || "Relationship Contact updated. Business card photos saved.";
      setEditingAgent(null);
      setSelectedAgent(null);
      await loadAgents();
      setMessage(finalUpdateMessage);
      resetFilters();
      goToTab("contacts");
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
    setLogForm({ ...EMPTY_LOG });
    setSaving(false);
    await loadAgents();
  }

  function exportTypeLabel(value) {
    return EXPORT_TYPES.find((item) => item.value === value)?.label || value;
  }

  function exportFilterSummary() {
    const pieces = [exportTypeLabel(exportForm.export_type), `Columns: ${EXPORT_COLUMN_PRESETS.find((item) => item.value === exportForm.column_preset)?.label || exportForm.column_preset}`];
    if (exportForm.start_date || exportForm.end_date) pieces.push(`Dates: ${exportForm.start_date || "Any"} to ${exportForm.end_date || "Any"}`);
    if (exportForm.export_type === "referrals" || exportForm.export_type === "everything") {
      if (exportForm.referral_status !== "All") pieces.push(`Referral Status: ${exportForm.referral_status}`);
      if (exportForm.lost_reason !== "All") pieces.push(`Lost Reason: ${exportForm.lost_reason}`);
      if (exportForm.referral_source !== "All") pieces.push(`Referral Source: ${exportForm.referral_source}`);
    }
    if (exportForm.export_type === "contacts" || exportForm.export_type === "everything") {
      if (exportForm.relationship_status !== "All") pieces.push(`Relationship Status: ${exportForm.relationship_status}`);
      if (exportForm.company_type !== "All") pieces.push(`Company Type: ${exportForm.company_type}`);
      if (exportForm.contact_origin !== "All") pieces.push(`Contact Origin: ${exportForm.contact_origin}`);
      if (exportForm.trust_level !== "All") pieces.push(`Trust Level: ${exportForm.trust_level}`);
    }
    if (exportForm.require_email) pieces.push("Require Email");
    if (exportForm.require_phone) pieces.push("Require Phone");
    if (exportForm.require_address) pieces.push("Require Mailing Address");
    if (exportForm.birthday_only) pieces.push("Birthday Only");
    return pieces.join(" | ");
  }

  function getExportDate(record, recordType) {
    if (exportForm.date_field === "created_at") return record.created_at || "";
    if (exportForm.date_field === "birthday") return record.birthday || record.customer_birthday || "";
    if (exportForm.date_field === "status_date") {
      if (recordType === "Referral Lead") return record.lost_drip_next_date || record.updated_at || record.created_at || "";
      return record.next_follow_up_date || record.last_contact_date || record.updated_at || record.created_at || "";
    }
    return record.updated_at || record.created_at || record.engagement_date || "";
  }

  function hasPhone(row) {
    return Boolean(row.phone || row.mobile_phone || row.office_phone || row.customer_phone);
  }

  function hasAddress(row) {
    return Boolean(row.address_1 || row.office_address || row.property_address_1);
  }

  function filterByExportRequirements(row) {
    if (exportForm.require_email && !row.email) return false;
    if (exportForm.require_phone && !hasPhone(row)) return false;
    if (exportForm.require_address && !hasAddress(row)) return false;
    if (exportForm.birthday_only && !row.birthday) return false;
    return true;
  }

  function trimColumns(row) {
    const common = ["record_type", "first_name", "last_name", "name", "company", "phone", "email", "address_1", "address_2", "city", "state", "zip", "birthday", "status", "notes"];
    const presets = {
      mailing: ["record_type", "first_name", "last_name", "name", "company", "address_1", "address_2", "city", "state", "zip", "birthday", "status", "referred_by", "referral_agency", "notes"],
      email: ["record_type", "first_name", "last_name", "name", "company", "email", "birthday", "status", "referred_by", "referral_agency", "notes"],
      phone: ["record_type", "first_name", "last_name", "name", "company", "phone", "mobile_phone", "office_phone", "status", "referred_by", "referral_agency", "notes"],
      pipeline: ["record_type", "first_name", "last_name", "name", "company", "status", "lost_reason", "referred_by", "referral_agency", "created_at", "updated_at", "last_contact_date", "next_follow_up_date", "lost_drip_step", "lost_drip_next_date", "notes"],
      full: Object.keys(row)
    };
    const fields = presets[exportForm.column_preset] || common;
    return fields.reduce((acc, key) => {
      acc[key] = row[key] ?? "";
      return acc;
    }, {});
  }

  function referralExportRows() {
    let list = [...referrals];
    if (exportForm.referral_status !== "All") list = list.filter((ref) => (ref.referral_status || "New Referral") === exportForm.referral_status);
    if (exportForm.lost_reason !== "All") list = list.filter((ref) => (ref.lost_reason || "") === exportForm.lost_reason);
    if (exportForm.referral_source !== "All") list = list.filter((ref) => (ref.sent_by_name || "Unknown Source") === exportForm.referral_source);

    return list
      .filter((ref) => dateInRange(getExportDate(ref, "Referral Lead") || today(), exportForm.start_date, exportForm.end_date))
      .map((ref) => ({
        record_type: "Referral Lead",
        id: ref.id || "",
        first_name: ref.customer_first_name || "",
        last_name: ref.customer_last_name || "",
        name: referralCustomerName(ref),
        company: "",
        role: "Homeowner",
        phone: ref.customer_phone || "",
        email: ref.customer_email || "",
        address_1: ref.property_address_1 || "",
        address_2: ref.property_address_2 || "",
        city: ref.property_city || "",
        state: ref.property_state || "",
        zip: ref.property_zip || "",
        birthday: ref.customer_birthday || "",
        status: ref.referral_status || "New Referral",
        lost_reason: ref.lost_reason || "",
        lost_drip_step: ref.lost_drip_step || "",
        lost_drip_next_date: ref.lost_drip_next_date || "",
        referred_by: ref.sent_by_name || "",
        referral_agency: ref.agency_name || "",
        created_at: ref.created_at || "",
        updated_at: ref.updated_at || "",
        notes: ref.referral_notes || ""
      }))
      .filter(filterByExportRequirements);
  }

  function contactExportRows() {
    let list = [...enrichedAgents];
    if (exportForm.relationship_status !== "All") list = list.filter((agent) => (agent.relationship_status || "") === exportForm.relationship_status);
    if (exportForm.company_type !== "All") list = list.filter((agent) => (agent.company_type || "") === exportForm.company_type);
    if (exportForm.contact_origin !== "All") list = list.filter((agent) => (agent.referral_source || "") === exportForm.contact_origin);
    if (exportForm.trust_level !== "All") list = list.filter((agent) => (agent.relationship_strength || "") === exportForm.trust_level);

    return list
      .filter((agent) => dateInRange(getExportDate(agent, "Relationship Contact") || today(), exportForm.start_date, exportForm.end_date))
      .map((agent) => ({
        record_type: "Relationship Contact",
        id: agent.id || "",
        first_name: agent.agent_first_name || "",
        last_name: agent.agent_last_name || "",
        name: agent.name || fullName(agent),
        company: agent.agency_name || "",
        role: agent.contact_role || "",
        phone: agent.agent_phone || agent.main_phone || "",
        mobile_phone: agent.agent_phone || "",
        office_phone: agent.main_phone || "",
        email: agent.agent_email || "",
        address_1: agent.address || "",
        address_2: "",
        city: agent.city || "",
        state: agent.state || "",
        zip: "",
        birthday: agent.birthday || "",
        status: agent.relationship_status || "",
        company_type: agent.company_type || "",
        contact_origin: agent.referral_source || "",
        trust_level: agent.relationship_strength || "",
        last_contact_date: agent.last_contact_date || "",
        next_follow_up_date: agent.next_follow_up_date || "",
        created_at: agent.created_at || "",
        updated_at: agent.updated_at || "",
        notes: agent.notes || ""
      }))
      .filter(filterByExportRequirements);
  }

  function activityExportRows() {
    const allLogs = [];
    Object.entries(logs).forEach(([agencyId, items]) => {
      const agent = enrichedAgents.find((a) => String(a.id) === String(agencyId));
      (items || []).forEach((item) => {
        allLogs.push({
          record_type: "Activity Log",
          id: item.id || "",
          agency_id: agencyId,
          name: agent ? agent.name : "Unknown Contact",
          company: agent ? agent.agency_name : "Unknown Company",
          status: item.engagement_type || "",
          action_taken: item.action_taken || "",
          engagement_date: item.engagement_date || "",
          outcome: item.outcome || "",
          next_action: item.next_action || "",
          notes: item.notes || "",
          created_at: item.created_at || item.engagement_date || "",
          updated_at: item.updated_at || item.engagement_date || ""
        });
      });
    });
    return allLogs.filter((item) => dateInRange(getExportDate(item, "Activity Log") || today(), exportForm.start_date, exportForm.end_date));
  }

  function buildExportRows() {
    let rows = [];
    if (exportForm.export_type === "referrals") rows = referralExportRows();
    if (exportForm.export_type === "contacts") rows = contactExportRows();
    if (exportForm.export_type === "activity") rows = activityExportRows();
    if (exportForm.export_type === "everything") rows = [...referralExportRows(), ...contactExportRows(), ...activityExportRows()];
    return rows.map(trimColumns);
  }

  async function runCsvExport(e) {
    e.preventDefault();
    setMessage("");

    if (!exportForm.reason.trim()) return setMessage("Export reason is required.");
    if (exportForm.start_date && exportForm.end_date && exportForm.start_date > exportForm.end_date) return setMessage("Export start date cannot be after end date.");

    const rows = buildExportRows();
    if (rows.length === 0) return setMessage("No records matched that export filter.");

    const filename = `avalanche_${exportForm.export_type}_${exportForm.column_preset}_${compactDate(exportForm.start_date)}_${compactDate(exportForm.end_date)}.csv`;
    const didDownload = downloadCsv(filename, rows);
    if (!didDownload) return setMessage("CSV export failed.");

    const log = {
      id: makeId(),
      export_type: exportForm.export_type,
      export_label: `${exportTypeLabel(exportForm.export_type)} | ${exportFilterSummary()}`,
      export_reason: exportForm.reason.trim(),
      date_start: exportForm.start_date || null,
      date_end: exportForm.end_date || null,
      row_count: rows.length,
      exported_at: new Date().toISOString()
    };

    const { error } = await supabase.from("export_logs").insert([log]);
    if (error) {
      setMessage(`CSV downloaded, but export log failed: ${error.message}`);
      return;
    }

    setExportLogs((current) => [log, ...current].slice(0, 12));
    setMessage(`CSV exported: ${rows.length} records. Export logged.`);
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
  const activeReferralLeads = referrals.filter((item) => ["New Referral", "Working", "Estimate Process"].includes(item.referral_status || "New Referral"));
  const signedReferralLeads = referrals.filter((item) => item.referral_status === "Contract Signed");
  const lostReferralLeads = referrals.filter((item) => item.referral_status === "Lost");
  const archivedReferralLeads = referrals.filter((item) => item.referral_status === "Archived");

  function referralMatchesSearch(ref, q) {
    if (!q) return true;
    return [
      referralCustomerName(ref),
      referralAddress(ref),
      ref.sent_by_name,
      ref.agency_name,
      ref.customer_phone,
      ref.customer_email,
      ref.referral_notes,
      ref.referral_status
    ].filter(Boolean).join(" ").toLowerCase().includes(q);
  }

  const referralBuckets = useMemo(() => {
    const map = new Map();
    activeReferralLeads.forEach((ref) => {
      const key = ref.sent_by_id || ref.sent_by_name || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          key,
          sent_by_id: ref.sent_by_id || "",
          sent_by_name: ref.sent_by_name || "Unknown Source",
          agency_name: ref.agency_name || "No agency",
          referrals: [],
          signed: 0,
          working: 0,
          lost: 0
        });
      }
      const bucket = map.get(key);
      bucket.referrals.push(ref);
      bucket.working += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.referrals.length - a.referrals.length);
  }, [activeReferralLeads]);

  const selectedReferralBucket = selectedReferralSource
    ? referralBuckets.find((bucket) => bucket.key === selectedReferralSource)
    : null;

  const roleOptions = useMemo(() => {
    const roles = enrichedAgents.map((a) => a.contact_role).filter(Boolean);
    return Array.from(new Set(roles)).sort();
  }, [enrichedAgents]);

  const officeOptions = useMemo(() => {
    const map = new Map();
    enrichedAgents.forEach((agent) => {
      if (!agent.agency_name || !agent.address) return;
      const key = officeKeyFromAgent(agent);
      if (!map.has(key)) {
        map.set(key, {
          key,
          agency_name: agent.agency_name || "",
          address: agent.address || "",
          city: agent.city || "",
          state: agent.state || "TX",
          main_phone: agent.main_phone || "",
          company_type: agent.company_type || "Insurance Agency",
          label: `${agent.agency_name || "Unknown Agency"} - ${[agent.address, agent.city, agent.state].filter(Boolean).join(", ")}`,
          contacts: []
        });
      }
      map.get(key).contacts.push(agent);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
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
    activeReferralLeads.forEach((ref) => {
      const name = ref.sent_by_name || "Unknown Source";
      if (!map[name]) map[name] = { source: name, count: 0 };
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [activeReferralLeads]);

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
    goToTab("contacts");
  }

  function filterCompany(type) {
    resetFilters();
    setCompanyFilter(type);
    goToTab("contacts");
  }

  function filterOrigin(source) {
    resetFilters();
    setOriginFilter(source);
    goToTab("contacts");
  }

  function filterStrength(strength) {
    resetFilters();
    setStrengthFilter(strength);
    goToTab("contacts");
  }

  return (
    <div style={styles.app}>
      <main style={styles.screen}>
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>Avalanche CRM</div>
            <h1 style={styles.h1}>{tab === "mission" ? "Today's Mission" : tab === "contacts" ? "Contacts" : tab === "referrals" ? "Referral Pipeline" : tab === "export" ? "Export Center" : tab === "add" ? "Add Record" : tab === "partners" ? "Partners" : "Playbook"}</h1>
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
              <Tile label="Referral Pipeline" value={activeReferralLeads.length} onClick={() => { setSelectedReferralSource(null); goToTab("referrals"); }} accent={TILE_ACCENTS.sync} />
            </div>

            {categorySummary.length > 0 && <SummarySection title="Relationship Categories" subtitle="Current contact mix by company type." items={categorySummary} labelKey="type" onClick={filterCompany} />}
            {originSummary.length > 0 && <SummarySection title="Contact Origin Snapshot" subtitle="How these relationship contacts entered your network." items={originSummary} labelKey="source" onClick={filterOrigin} />}
            {referralAttributionSummary.length > 0 && <SummarySection title="Referral Attribution Snapshot" subtitle="Who is sending roofing opportunities into Avalanche." items={referralAttributionSummary} labelKey="source" onClick={() => { setSelectedReferralSource(null); goToTab("referrals"); }} />}
            {strengthSummary.length > 0 && <SummarySection title="Trust Level Snapshot" subtitle="How strong your current network feels." items={strengthSummary} labelKey="strength" onClick={filterStrength} />}

            <Section title="Recent Referral Leads" subtitle="Saved referral records stored in Supabase.">
              {referrals.length === 0 ? <p>No Referral Leads saved yet.</p> : referrals.slice(0, 5).map((ref) => <ReferralRow key={ref.id} referral={ref} open={() => { resetView(); setSelectedReferral(ref); }} />)}
            </Section>

            <Section title="Recent Activity" subtitle="Latest relationship touches logged in the CRM.">
              {recentActivity.length === 0 ? <p>No activity logged yet.</p> : recentActivity.map((item) => <ActivityPreview key={item.id} item={item} />)}
            </Section>
          </div>
        )}

        {!loading && tab === "referrals" && (
          <ReferralPipeline
            buckets={referralBuckets}
            selectedBucket={selectedReferralBucket}
            selectedReferralSource={selectedReferralSource}
            setSelectedReferralSource={setSelectedReferralSource}
            openReferral={(ref) => { resetView(); setSelectedReferral(ref); }}
            updateReferralStatus={updateReferralStatus}
            signedReferrals={signedReferralLeads}
            lostReferrals={lostReferralLeads}
            archivedReferrals={archivedReferralLeads}
            archiveSearch={referralArchiveSearch}
            setArchiveSearch={setReferralArchiveSearch}
            referralMatchesSearch={referralMatchesSearch}
            sendLostDripEmail={sendLostDripEmail}
          />
        )}

        {!loading && tab === "contacts" && (
          <div style={styles.stack}>
            <Section title="Referral Leads" subtitle="Customer/job intake records created from relationship referrals.">
              {referrals.length === 0 ? <p>No Referral Leads saved yet.</p> : referrals.map((ref) => <ReferralRow key={ref.id} referral={ref} open={() => { resetView(); setSelectedReferral(ref); }} />)}
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
              {directory.length === 0 ? <p>No contacts match this filter.</p> : directory.map((agent) => <ContactRow key={agent.id} agent={agent} open={() => { resetView(); setSelectedAgent(agent); }} openCall={() => setCallAgent(agent)} emailAndLog={() => emailAndLog(agent)} />)}
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
              <ContactForm form={agentForm} setForm={setAgentForm} cardPhotos={agentCardPhotos} setCardPhotos={setAgentCardPhotos} officeOptions={officeOptions} onSubmit={saveAgent} saving={saving} nextFollowUp={nextFollowUp} today={today} buttonText="Save Relationship Contact" />
            ) : (
              <ReferralLeadForm form={referralForm} setForm={setReferralForm} agents={enrichedAgents} populateReferralSource={populateReferralSource} onSubmit={saveReferralLead} buttonText="Save Referral Lead" />
            )}
          </div>
        )}

        {!loading && tab === "partners" && (
          <div style={styles.stack}>
            <Section title="Active Referral Partners" subtitle="Referral relationships already producing or actively trusted.">
              {activePartners.length === 0 ? <p>No active referral partners yet.</p> : activePartners.map((agent) => <ContactRow key={agent.id} agent={agent} open={() => { resetView(); setSelectedAgent(agent); }} openCall={() => setCallAgent(agent)} emailAndLog={() => emailAndLog(agent)} />)}
            </Section>
            <Section title="VIP Referral Partners" subtitle="Strategic relationships worth protecting intentionally.">
              {vipPartners.length === 0 ? <p>No VIP referral partners yet.</p> : vipPartners.map((agent) => <ContactRow key={agent.id} agent={agent} open={() => { resetView(); setSelectedAgent(agent); }} openCall={() => setCallAgent(agent)} emailAndLog={() => emailAndLog(agent)} soft />)}
            </Section>
          </div>
        )}

        {!loading && tab === "export" && (
          <ExportCenter form={exportForm} setForm={setExportForm} onExport={runCsvExport} logs={exportLogs} referrals={referrals} agents={enrichedAgents} />
        )}

        {!loading && tab === "playbook" && <Playbook openExport={() => goToTab("export")} />}
      </main>

      <nav style={styles.nav}>
        <button style={tab === "mission" ? styles.navOn : styles.navButton} onClick={() => goToTab("mission")}>Mission</button>
        <button style={tab === "contacts" ? styles.navOn : styles.navButton} onClick={() => setTab("contacts")}>Contacts</button>
        <button style={tab === "add" ? styles.navOn : styles.navButton} onClick={() => goToTab("add")}>Add</button>
        <button style={tab === "partners" ? styles.navOn : styles.navButton} onClick={() => goToTab("partners")}>Partners</button>
        <button style={tab === "playbook" ? styles.navOn : styles.navButton} onClick={() => goToTab("playbook")}>Playbook</button>
      </nav>

      {selectedAgent && <ContactProfile agent={selectedAgent} cardPhotos={{ front: selectedAgent.business_card_front || getCardPhotos(selectedAgent.id).front || "", back: selectedAgent.business_card_back || getCardPhotos(selectedAgent.id).back || "" }} logs={logs[selectedAgent.id] || []} close={() => setSelectedAgent(null)} startEdit={startEdit} deleteAgent={deleteAgent} moveToDoNotPursue={moveToDoNotPursue} openCall={() => setCallAgent(selectedAgent)} emailAndLog={() => emailAndLog(selectedAgent)} startLog={startLog} />}
      {selectedReferral && <ReferralProfile referral={selectedReferral} close={() => setSelectedReferral(null)} edit={() => { setEditingReferral(selectedReferral); setSelectedReferral(null); }} updateReferralStatus={updateReferralStatus} archiveReferral={archiveReferral} sendLostDripEmail={sendLostDripEmail} />}
      {editingReferral && <ReferralEditModal form={editingReferral} setForm={setEditingReferral} agents={enrichedAgents} populateReferralSource={populateReferralSource} updateReferralLead={updateReferralLead} close={() => setEditingReferral(null)} />}
      {pendingLostReferral && <LostReasonModal referral={pendingLostReferral} close={() => setPendingLostReferral(null)} finalizeLostReferral={finalizeLostReferral} />}
      {callAgent && <CallChoiceModal agent={callAgent} close={() => setCallAgent(null)} startLog={startLog} />}
      {logAgent && <ActivityLogModal agent={logAgent} type={logType} form={logForm} setForm={setLogForm} saveActivity={saveActivity} saving={saving} close={() => setLogAgent(null)} />}
      {editingAgent && <EditModal form={editingAgent} setForm={setEditingAgent} cardPhotos={editingCardPhotos} setCardPhotos={setEditingCardPhotos} officeOptions={officeOptions} updateAgent={updateAgent} saving={saving} close={() => setEditingAgent(null)} nextFollowUp={nextFollowUp} today={today} />}
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


function ReferralPipeline({ buckets, selectedBucket, selectedReferralSource, setSelectedReferralSource, openReferral, updateReferralStatus, signedReferrals = [], lostReferrals = [], archivedReferrals = [], archiveSearch, setArchiveSearch, referralMatchesSearch, sendLostDripEmail }) {
  const visibleBuckets = buckets || [];
  const q = String(archiveSearch || "").trim().toLowerCase();
  const signedVisible = signedReferrals.filter((ref) => referralMatchesSearch(ref, q));
  const lostVisible = lostReferrals.filter((ref) => referralMatchesSearch(ref, q));
  const archivedVisible = archivedReferrals.filter((ref) => referralMatchesSearch(ref, q));
  const [bucketFilters, setBucketFilters] = useState({});

  function getBucketFilter(key) {
    return bucketFilters[key] || "All";
  }

  function chooseBucketFilter(bucket, filter) {
    setSelectedReferralSource(bucket.key);
    setBucketFilters((current) => ({ ...current, [bucket.key]: filter }));
  }

  function toggleBucket(bucket) {
    setSelectedReferralSource(selectedReferralSource === bucket.key ? null : bucket.key);
  }

  const selectedFilter = selectedBucket ? getBucketFilter(selectedBucket.key) : "All";
  const rawActiveList = selectedBucket ? selectedBucket.referrals : visibleBuckets.flatMap((bucket) => bucket.referrals);
  const activeList = selectedBucket && selectedFilter !== "All"
    ? rawActiveList.filter((ref) => (ref.referral_status || "New Referral") === selectedFilter)
    : rawActiveList;

  return (
    <div style={styles.stack}>
      <Section title="Referral Pipeline" subtitle="Active referral leads grouped by agency and the person who sent them.">
        {visibleBuckets.length === 0 ? <p>No active referral leads yet.</p> : visibleBuckets.map((bucket) => {
          const filter = getBucketFilter(bucket.key);
          const workingCount = bucket.referrals.filter((ref) => (ref.referral_status || "New Referral") === "Working").length;
          const estimateCount = bucket.referrals.filter((ref) => (ref.referral_status || "New Referral") === "Estimate Process").length;
          const newCount = bucket.referrals.filter((ref) => (ref.referral_status || "New Referral") === "New Referral").length;
          return (
            <div key={bucket.key} style={selectedReferralSource === bucket.key ? styles.pipelineBucketOn : styles.pipelineBucket}>
              <div style={{ flex: 1 }} onClick={() => toggleBucket(bucket)}>
                <b>{bucket.sent_by_name}</b>
                <p>{bucket.agency_name}</p>
                <div style={styles.actionRowSmall}>
                  <button type="button" style={filter === "All" && selectedReferralSource === bucket.key ? actionStyle("sync") : actionStyle("neutral")} onClick={(e) => { e.stopPropagation(); chooseBucketFilter(bucket, "All"); }}>All ({bucket.referrals.length})</button>
                  <button type="button" style={filter === "Working" && selectedReferralSource === bucket.key ? actionStyle("sync") : actionStyle("neutral")} onClick={(e) => { e.stopPropagation(); chooseBucketFilter(bucket, "Working"); }}>Working ({workingCount})</button>
                  <button type="button" style={filter === "Estimate Process" && selectedReferralSource === bucket.key ? actionStyle("ask") : actionStyle("neutral")} onClick={(e) => { e.stopPropagation(); chooseBucketFilter(bucket, "Estimate Process"); }}>Estimate ({estimateCount})</button>
                </div>
              </div>
              <div style={styles.pipelineStats} onClick={() => toggleBucket(bucket)}>
                <span>{bucket.referrals.length} active</span>
                <span>{newCount} new</span>
                <span>{workingCount} working</span>
                <span>{estimateCount} estimate</span>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title={selectedBucket ? `${selectedBucket.sent_by_name} ${selectedFilter === "All" ? "Active" : selectedFilter} Referrals` : "All Active Referrals"} subtitle="Open a referral or update the current outcome directly from the pipeline.">
        {activeList.length === 0 ? <p>No referrals match this bucket filter.</p> : activeList.map((ref) => (
          <ReferralRow key={ref.id} referral={ref} open={() => openReferral(ref)} updateReferralStatus={updateReferralStatus} />
        ))}
      </Section>

      <Section title="Signed and Lost Referral Archive" subtitle="Search closed referral outcomes. Lost referrals carry 30/60/90-day stay-in-touch email prompts.">
        <input style={styles.input} value={archiveSearch || ""} onChange={(e) => setArchiveSearch(e.target.value)} placeholder="Search signed, lost, archived referrals..." />

        <div style={styles.archiveHeader}>Signed Referrals ({signedVisible.length})</div>
        {signedVisible.length === 0 ? <p>No signed referrals match this search.</p> : signedVisible.map((ref) => (
          <ReferralRow key={ref.id} referral={ref} open={() => openReferral(ref)} updateReferralStatus={updateReferralStatus} />
        ))}

        <div style={styles.archiveHeader}>Lost Referrals ({lostVisible.length})</div>
        {lostVisible.length === 0 ? <p>No lost referrals match this search.</p> : lostVisible.map((ref) => (
          <ReferralRow key={ref.id} referral={ref} open={() => openReferral(ref)} updateReferralStatus={updateReferralStatus} sendLostDripEmail={sendLostDripEmail} />
        ))}

        {archivedVisible.length > 0 && <div style={styles.archiveHeader}>Archived Referrals ({archivedVisible.length})</div>}
        {archivedVisible.map((ref) => (
          <ReferralRow key={ref.id} referral={ref} open={() => openReferral(ref)} updateReferralStatus={updateReferralStatus} />
        ))}
      </Section>
    </div>
  );
}


function ReferralRow({ referral, open, updateReferralStatus, sendLostDripEmail }) {
  const status = referral.referral_status || "New Referral";
  const customer = referralCustomerName(referral);
  const address = referralAddress(referral);
  const lostReason = referral.lost_reason || "";
  const dripStep = referral.lost_drip_step || "";
  const dripDate = referral.lost_drip_next_date || "";

  return (
    <div style={{ ...styles.row, borderLeft: `6px solid ${status === "Contract Signed" ? "#22c55e" : status === "Lost" ? "#ef4444" : status === "Estimate Process" ? "#facc15" : "#a78bfa"}` }}>
      <div onClick={open} style={{ cursor: "pointer" }}>
        <b>{customer}</b>
        <p>{address || "No property address saved"}</p>
        <small>Sent by {referral.sent_by_name || "Unknown"} · {referral.agency_name || "No agency"}</small>
        <div style={styles.actionRowSmall}>
          <ReferralStatusBadge status={status} />
          {lostReason && <span style={styles.badge}>{lostReason}</span>}
          {status === "Lost" && dripStep && dripDate && <span style={styles.badge}>{dripStep === "evergreen" ? "Evergreen" : `${dripStep} Day`} · {dripDate}</span>}
        </div>
      </div>
      <div style={styles.actionRowSmall}>
        <button type="button" style={actionStyle("neutral")} onClick={(e) => { e.stopPropagation(); open(); }}>Open</button>
        {updateReferralStatus && status !== "Working" && <button type="button" style={actionStyle("sync")} onClick={(e) => { e.stopPropagation(); updateReferralStatus(referral, "Working"); }}>Working</button>}
        {updateReferralStatus && status !== "Estimate Process" && <button type="button" style={actionStyle("ask")} onClick={(e) => { e.stopPropagation(); updateReferralStatus(referral, "Estimate Process"); }}>Estimate</button>}
        {updateReferralStatus && status !== "Contract Signed" && <button type="button" style={actionStyle("won")} onClick={(e) => { e.stopPropagation(); updateReferralStatus(referral, "Contract Signed"); }}>Signed</button>}
        {sendLostDripEmail && status === "Lost" && <button type="button" style={actionStyle("email")} onClick={(e) => { e.stopPropagation(); sendLostDripEmail(referral); }}>Email</button>}
      </div>
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
        {(agent.agent_phone || agent.main_phone) && <button style={actionStyle("call")} onClick={(e) => { e.stopPropagation(); openCall(); }}>Call</button>}
        {agent.agent_email && <button style={actionStyle("email")} onClick={(e) => { e.stopPropagation(); emailAndLog(); }}>Email</button>}
        <button style={actionStyle("neutral")} onClick={(e) => { e.stopPropagation(); open(); }}>Open</button>
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
          {(agent.agent_phone || agent.main_phone) && <button style={actionStyle("call")} onClick={(e) => { e.stopPropagation(); openCall(); }}>Call</button>}
          {agent.agent_phone && <a style={actionStyle("text")} href={`sms:${agent.agent_phone}`}>Text</a>}
          {address && <a style={actionStyle("map")} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Map</a>}
          {agent.agent_email && <button style={actionStyle("email")} onClick={(e) => { e.stopPropagation(); emailAndLog(); }}>Email</button>}
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

function ReferralProfile({ referral, close, edit, updateReferralStatus, archiveReferral, sendLostDripEmail }) {
  const status = referral.referral_status || "New Referral";
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={actionStyle("neutral")} onClick={close}>Close</button>
        <ReferralStatusBadge status={status} />
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
          {status === "Lost" && <p><b>Lost Reason:</b> {referral.lost_reason || "Insurance Denied"}</p>}
          {status === "Lost" && <p><b>Next Lost Follow-Up:</b> {lostReasonHasDrip(referral.lost_reason || "Insurance Denied") ? `${referral.lost_drip_next_date || "Not scheduled"} · ${lostDripLabel(referral)}` : "No automatic drip"}</p>}
        </div>
        <div style={styles.cardInner}>
          <h3>Referral Outcome</h3>
          <p style={styles.sub}>Update where this referral stands without deleting the history.</p>
          <div style={styles.actionRow}>
            <button style={actionStyle("neutral")} onClick={() => updateReferralStatus(referral, "Working")}>Working</button>
            <button style={actionStyle("ask")} onClick={() => updateReferralStatus(referral, "Estimate Process")}>Estimate Process</button>
            <button style={actionStyle("won")} onClick={() => updateReferralStatus(referral, "Contract Signed")}>Contract Signed</button>
            <button style={actionStyle("caution")} onClick={() => updateReferralStatus(referral, "Lost")}>Lost</button>
          </div>
        </div>
        <div style={styles.actionRow}>
          {status === "Lost" && lostReasonHasDrip(referral.lost_reason || "Insurance Denied") && referral.customer_email && <button style={actionStyle("email")} onClick={() => sendLostDripEmail(referral)}>{lostDripLabel(referral)}</button>}
          <button style={actionStyle("edit")} onClick={edit}>Edit</button>
          <button style={actionStyle("delete")} onClick={() => archiveReferral(referral)}>Archive</button>
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

function EditModal({ form, setForm, cardPhotos, setCardPhotos, officeOptions, updateAgent, saving, close, nextFollowUp, today }) {
  return <div style={styles.overlay}><div style={styles.sheet}><button style={actionStyle("neutral")} onClick={close}>Cancel</button><h2>Edit Relationship Contact</h2><ContactForm form={form} setForm={setForm} cardPhotos={cardPhotos} setCardPhotos={setCardPhotos} officeOptions={officeOptions} onSubmit={updateAgent} saving={saving} nextFollowUp={nextFollowUp} today={today} buttonText="Update Relationship Contact" /></div></div>;
}

function LostReasonModal({ referral, close, finalizeLostReferral }) {
  const [reason, setReason] = useState(referral?.lost_reason && LOST_REASONS.includes(referral.lost_reason) ? referral.lost_reason : "Insurance Denied");
  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <button style={actionStyle("neutral")} onClick={close}>Cancel</button>
        <h2>Choose Lost Reason</h2>
        <p style={styles.sub}>This controls whether Avalanche starts a homeowner follow-up sequence. Choose Other - No Drip when you do not want future automatic follow-up prompts.</p>
        <Select label="Lost Reason" value={reason} options={LOST_REASONS} onChange={setReason} />
        {lostReasonHasDrip(reason) ? (
          <div style={styles.cardInner}>This will start the 30/60/90-day homeowner follow-up sequence, then move to the 60-day relationship touch.</div>
        ) : (
          <div style={styles.cardInner}>This will mark the referral Lost but will not create any automatic drip dates or email prompts.</div>
        )}
        <button style={actionStyle("save", true)} onClick={() => finalizeLostReferral(referral, reason)}>Save Lost Reason</button>
      </div>
    </div>
  );
}

function ReferralEditModal({ form, setForm, agents, populateReferralSource, updateReferralLead, close }) {
  return <div style={styles.overlay}><div style={styles.sheet}><button style={actionStyle("neutral")} onClick={close}>Cancel</button><h2>Edit Referral Lead</h2><ReferralLeadForm form={form} setForm={setForm} agents={agents} populateReferralSource={(id) => populateReferralSource(id, setForm)} onSubmit={updateReferralLead} buttonText="Update Referral Lead" /></div></div>;
}

function ContactForm({ form, setForm, cardPhotos, setCardPhotos, officeOptions = [], onSubmit, saving, nextFollowUp, today, buttonText }) {
  function set(key, value) { setForm({ ...form, [key]: value }); }

  const currentOfficeKey = officeKeyFromAgent(form);
  const relatedOfficeContacts = officeOptions.find((office) => office.key === currentOfficeKey)?.contacts || [];

  function applyOffice(key) {
    const office = officeOptions.find((item) => item.key === key);
    if (!office) return;
    setForm({
      ...form,
      agency_name: office.agency_name,
      address: office.address,
      city: office.city,
      state: office.state,
      main_phone: office.main_phone,
      company_type: office.company_type
    });
  }
  return <form style={styles.form} onSubmit={onSubmit}>{officeOptions.length > 0 && (
    <Section title="Office / Location Memory" subtitle="Choose an existing office to auto-fill company and address details.">
      <label style={styles.label}>Existing Office Location
        <select style={styles.input} value="" onChange={(e) => applyOffice(e.target.value)}>
          <option value="">Select existing office</option>
          {officeOptions.map((office) => <option key={office.key} value={office.key}>{office.label}</option>)}
        </select>
      </label>
      {relatedOfficeContacts.length > 0 && (
        <div style={styles.cardInner}>
          <b>People already saved at this location:</b>
          {relatedOfficeContacts.map((contact) => <p key={contact.id}>{contact.name} · {contact.contact_role || "No role"}</p>)}
        </div>
      )}
    </Section>
  )}<Select label="Relationship Status" value={form.relationship_status} options={STATUSES} onChange={(v) => {
  const baseDate = today();
  const autoDate = nextFollowUp(v, baseDate);
  setForm({ ...form, relationship_status: v, last_contact_date: baseDate, next_follow_up_date: autoDate || "" });
}} /><Input label="Company Name" value={form.agency_name} onChange={(v) => set("agency_name", v)} required /><Input label="First Name" value={form.agent_first_name} onChange={(v) => set("agent_first_name", v)} /><Input label="Last Name" value={form.agent_last_name} onChange={(v) => set("agent_last_name", v)} /><Input label="Mobile Phone" value={form.agent_phone} onChange={(v) => set("agent_phone", v)} /><Input label="Office Phone" value={form.main_phone} onChange={(v) => set("main_phone", v)} /><Input label="Email" value={form.agent_email} onChange={(v) => set("agent_email", v)} /><Input label="Office Address" value={form.address} onChange={(v) => set("address", v)} /><Input label="City" value={form.city} onChange={(v) => set("city", v)} /><Input label="State" value={form.state} onChange={(v) => set("state", v)} /><Select label="Company Type" value={form.company_type} options={COMPANY_TYPES} onChange={(v) => set("company_type", v)} /><DatalistInput label="Contact Role" value={form.contact_role} onChange={(v) => set("contact_role", v)} suggestions={CONTACT_ROLE_SUGGESTIONS} /><Select label="Contact Origin" value={form.referral_source} options={CONTACT_ORIGINS} onChange={(v) => set("referral_source", v)} /><Select label="Trust Level" value={form.relationship_strength} options={RELATIONSHIP_STRENGTH} onChange={(v) => set("relationship_strength", v)} /><BusinessCardUpload cardPhotos={cardPhotos} setCardPhotos={setCardPhotos} /><Input label="Introduced By" value={form.introduced_by} onChange={(v) => set("introduced_by", v)} /><Input type="date" label="Last Contact" value={form.last_contact_date} onChange={(v) => {
  const autoDate = nextFollowUp(form.relationship_status, v);
  setForm({ ...form, last_contact_date: v, next_follow_up_date: autoDate || "" });
}} /><Input type="date" label="Scheduled Follow Up" value={form.next_follow_up_date} onChange={(v) => set("next_follow_up_date", v)} /><Input label="Favorite Food / Drink" value={form.favorite_food} onChange={(v) => set("favorite_food", v)} /><Input label="Birthday" value={form.birthday} onChange={(v) => set("birthday", v)} /><Input label="Tags" value={form.tags} onChange={(v) => set("tags", v)} /><Textarea label="Memory Notes" value={form.notes} onChange={(v) => set("notes", v)} /><button style={actionStyle("save", true)} disabled={saving}>{saving ? "Saving..." : buttonText}</button></form>;
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

      <Section title="Customer Information" subtitle="Customer details for this referral lead.">
        <Input label="Customer First Name" value={form.customer_first_name} onChange={(v) => set("customer_first_name", v)} />
        <Input label="Customer Last Name" value={form.customer_last_name} onChange={(v) => set("customer_last_name", v)} />
        <Input label="Customer Phone" value={form.customer_phone} onChange={(v) => set("customer_phone", v)} />
        <Input label="Customer Email" value={form.customer_email} onChange={(v) => set("customer_email", v)} />
      </Section>

      <Section title="Property Address" subtitle="Property address for this referral opportunity.">
        <Input label="Address 1" value={form.property_address_1} onChange={(v) => set("property_address_1", v)} />
        <Input label="Address 2" value={form.property_address_2} onChange={(v) => set("property_address_2", v)} />
        <Input label="City" value={form.property_city} onChange={(v) => set("property_city", v)} />
        <Input label="State" value={form.property_state} onChange={(v) => set("property_state", v)} />
        <Input label="Zip" value={form.property_zip} onChange={(v) => set("property_zip", v)} />
      </Section>

      <Section title="Referral Status" subtitle="Track what happened to this referral lead.">
        <Select label="Referral Status" value={form.referral_status || "New Referral"} options={REFERRAL_STATUSES} onChange={(v) => {
          const next = { ...form, referral_status: v, updated_at: todayStatic() };
          if (v === "Lost") {
            next.lost_reason = next.lost_reason || "Insurance Denied";
            if (lostReasonHasDrip(next.lost_reason)) {
              next.lost_drip_step = "30";
              next.lost_drip_next_date = addDaysStatic(todayStatic(), 30);
              next.lost_drip_last_sent_date = null;
            } else {
              next.lost_drip_step = null;
              next.lost_drip_next_date = null;
              next.lost_drip_last_sent_date = null;
            }
          } else {
            next.lost_reason = "";
            next.lost_drip_step = null;
            next.lost_drip_next_date = null;
            next.lost_drip_last_sent_date = null;
          }
          setForm(next);
        }} />
        {(form.referral_status || "New Referral") === "Lost" && <Select label="Lost Reason" value={form.lost_reason || "Insurance Denied"} options={LOST_REASONS} onChange={(v) => {
          const next = { ...form, lost_reason: v, updated_at: todayStatic() };
          if (lostReasonHasDrip(v)) {
            next.lost_drip_step = "30";
            next.lost_drip_next_date = addDaysStatic(todayStatic(), 30);
            next.lost_drip_last_sent_date = null;
          } else {
            next.lost_drip_step = null;
            next.lost_drip_next_date = null;
            next.lost_drip_last_sent_date = null;
          }
          setForm(next);
        }} />}
      </Section>

      <Section title="Internal Notes" subtitle="Keep this limited to referral intake notes, not production workflow.">
        <Textarea label="Referral Notes" value={form.referral_notes} onChange={(v) => set("referral_notes", v)} />
      </Section>

      <button style={actionStyle("save", true)} disabled={false}>{buttonText}</button>
    </form>
  );
}

function BusinessCardUpload({ cardPhotos, setCardPhotos }) {
  function resizeImage(file, callback) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 900;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL("image/jpeg", 0.58));
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

function ExportCenter({ form, setForm, onExport, logs, referrals = [], agents = [] }) {
  function set(key, value) {
    setForm({ ...form, [key]: value });
  }

  function toggle(key) {
    setForm({ ...form, [key]: !form[key] });
  }

  const referralSources = Array.from(new Set(referrals.map((ref) => ref.sent_by_name).filter(Boolean))).sort();
  const showReferralFilters = form.export_type === "referrals" || form.export_type === "everything";
  const showContactFilters = form.export_type === "contacts" || form.export_type === "everything";

  return (
    <div style={styles.stack}>
      <Section title="Export Center" subtitle="Build a custom CSV for card services, email lists, birthday touches, pipeline reports, vendor imports, or backup review. Every export is logged in Supabase with the reason and row count.">
        <form style={styles.form} onSubmit={onExport}>
          <label style={styles.label}>Record Type
            <select style={styles.input} value={form.export_type} onChange={(e) => set("export_type", e.target.value)}>
              {EXPORT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label style={styles.label}>Column Format
            <select style={styles.input} value={form.column_preset} onChange={(e) => set("column_preset", e.target.value)}>
              {EXPORT_COLUMN_PRESETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label style={styles.label}>Date Field To Filter
            <select style={styles.input} value={form.date_field} onChange={(e) => set("date_field", e.target.value)}>
              {EXPORT_DATE_FIELDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <Input type="date" label="Start Date" value={form.start_date} onChange={(v) => set("start_date", v)} />
          <Input type="date" label="End Date" value={form.end_date} onChange={(v) => set("end_date", v)} />

          {showReferralFilters && (
            <div style={styles.cardInner}>
              <h3>Referral Lead Filters</h3>
              <label style={styles.label}>Referral Status
                <select style={styles.input} value={form.referral_status} onChange={(e) => set("referral_status", e.target.value)}>
                  <option>All</option>
                  {REFERRAL_STATUSES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label style={styles.label}>Lost Reason
                <select style={styles.input} value={form.lost_reason} onChange={(e) => set("lost_reason", e.target.value)}>
                  <option>All</option>
                  {LOST_REASONS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label style={styles.label}>Referral Source / Agent
                <select style={styles.input} value={form.referral_source} onChange={(e) => set("referral_source", e.target.value)}>
                  <option>All</option>
                  {referralSources.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          )}

          {showContactFilters && (
            <div style={styles.cardInner}>
              <h3>Relationship Contact Filters</h3>
              <label style={styles.label}>Relationship Status
                <select style={styles.input} value={form.relationship_status} onChange={(e) => set("relationship_status", e.target.value)}>
                  <option>All</option>
                  {STATUSES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label style={styles.label}>Company Type
                <select style={styles.input} value={form.company_type} onChange={(e) => set("company_type", e.target.value)}>
                  <option>All</option>
                  {COMPANY_TYPES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label style={styles.label}>Contact Origin
                <select style={styles.input} value={form.contact_origin} onChange={(e) => set("contact_origin", e.target.value)}>
                  <option>All</option>
                  {CONTACT_ORIGINS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label style={styles.label}>Trust Level
                <select style={styles.input} value={form.trust_level} onChange={(e) => set("trust_level", e.target.value)}>
                  <option>All</option>
                  {RELATIONSHIP_STRENGTH.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          )}

          <div style={styles.cardInner}>
            <h3>Data Requirements</h3>
            <label style={styles.checkLabel}><input type="checkbox" checked={Boolean(form.require_email)} onChange={() => toggle("require_email")} /> Require email address</label>
            <label style={styles.checkLabel}><input type="checkbox" checked={Boolean(form.require_phone)} onChange={() => toggle("require_phone")} /> Require phone number</label>
            <label style={styles.checkLabel}><input type="checkbox" checked={Boolean(form.require_address)} onChange={() => toggle("require_address")} /> Require mailing address</label>
            <label style={styles.checkLabel}><input type="checkbox" checked={Boolean(form.birthday_only)} onChange={() => toggle("birthday_only")} /> Birthday records only</label>
          </div>

          <Input label="Reason for Export" value={form.reason} onChange={(v) => set("reason", v)} required />
          <button style={actionStyle("save", true)}>Download Custom CSV + Log Export</button>
        </form>
      </Section>

      <Section title="Recent Export Log" subtitle="Last exports recorded in Supabase so you know what was pulled, when, and why.">
        {!logs || logs.length === 0 ? <p>No exports logged yet.</p> : logs.map((log) => (
          <div key={log.id || `${log.exported_at}-${log.export_type}`} style={styles.timelineItem}>
            <b>{log.export_label || log.export_type}</b>
            <p>{log.export_reason || "No reason saved"}</p>
            <p><b>Date Range:</b> {log.date_start || "Any"} to {log.date_end || "Any"}</p>
            <p><b>Rows:</b> {log.row_count || 0} · <b>Exported:</b> {String(log.exported_at || "").slice(0, 19).replace("T", " ")}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Playbook({ openExport }) {
  return (
    <div style={styles.stack}>
      <Section title="Playbook" subtitle="Current architecture logic">
        <button style={actionStyle("sync", true)} onClick={openExport}>Open Export Center</button>
        <p style={styles.sub}>Use Export Center for Christmas cards, Thanksgiving touches, birthday lists, customer exports, and backup review files.</p>
        <p><b>Relationship Contact:</b> agents, realtors, property managers, vendors, inspectors, and other referral relationships.</p>
        <p><b>Referral Lead:</b> customer/job intake that came through a relationship contact.</p>
        <p><b>New Prospect:</b> 15+ day relationship touch.</p>
        <p><b>Needs Follow Up:</b> 15+ day relationship touch.</p>
        <p><b>Warm Relationship:</b> 30+ day relationship touch.</p>
        <p><b>Maintenance Relationship:</b> 60+ day relationship touch.</p>
        <p><b>Active Referral Partner:</b> no automated sales trigger.</p>
        <p><b>VIP Referral Partner:</b> 45+ day soft relationship touch.</p>
        <p><b>Referral Pipeline:</b> referral leads are stored in Supabase, grouped by agency/agent, and tracked by outcome. Signed and Lost referrals move out of the active pipeline into searchable closed-out buckets. Lost referrals use a required Lost Reason dropdown. Insurance Denied, Delayed Project, Went With Competitor, and Financial Reasons receive reason-specific 30/60/90-day homeowner follow-up prompts, then move to a 60-day evergreen stay-in-touch rhythm. Other - No Drip keeps the referral searchable but creates no automatic follow-up.</p>
      </Section>
    </div>
  );
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
  input: { width: "100%", marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, outlineColor: "#38bdf8", fontSize: 16, fontWeight: 600 },
  textarea: { width: "100%", minHeight: 90, marginTop: 4, marginBottom: 10, padding: 12, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, outlineColor: "#38bdf8" },
  label: { display: "block", fontWeight: 800, color: COLORS.secondary },
  checkLabel: { display: "flex", alignItems: "center", gap: 10, fontWeight: 800, color: COLORS.secondary, marginTop: 10, marginBottom: 10 },
  form: { background: COLORS.cardBg, padding: 14, borderRadius: 18, marginTop: 12, border: `1px solid ${COLORS.border}` },
  modeGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  modeButton: { padding: 14, borderRadius: 14, fontWeight: 900, border: `1px solid ${COLORS.border}`, background: COLORS.innerBg, color: COLORS.secondary },
  modeButtonOn: { padding: 14, borderRadius: 14, fontWeight: 900, border: `1px solid ${ACTION_COLORS.sync.border}`, background: ACTION_COLORS.sync.background, color: ACTION_COLORS.sync.color },
  pipelineBucket: { background: COLORS.innerBg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderLeft: `5px solid ${TILE_ACCENTS.sync}`, borderRadius: 14, padding: 12, textAlign: "left", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  pipelineBucketOn: { background: "#24145f", color: COLORS.text, border: `1px solid ${TILE_ACCENTS.sync}`, borderLeft: `5px solid ${TILE_ACCENTS.sync}`, borderRadius: 14, padding: 12, textAlign: "left", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  pipelineStats: { display: "flex", flexDirection: "column", gap: 4, color: COLORS.secondary, fontSize: 12, textAlign: "right" },
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
  archiveHeader: { marginTop: 16, paddingTop: 12, borderTop: `1px solid ${COLORS.border}`, color: COLORS.text, fontWeight: 900, fontSize: 18 },
  metaStack: { display: "flex", flexDirection: "column", gap: 5, marginTop: 6, color: COLORS.secondary }
};
