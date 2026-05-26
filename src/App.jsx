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
