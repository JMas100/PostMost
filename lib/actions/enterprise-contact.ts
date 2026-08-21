"use server";

import { track } from "@/lib/analytics/track";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitEnterpriseContact(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const volume = String(formData.get("volume") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!name) return { error: "Name is required." };
  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid work email." };
  if (!company) return { error: "Company is required." };
  if (!message) return { error: "Tell us what you need." };

  await track("enterprise_contact_submitted", null, { name, email, company, volume, message });

  return { success: true };
}
