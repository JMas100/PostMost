"use server";

import { track } from "@/lib/analytics/track";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitEnterpriseContact(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const volume = String(formData.get("volume") || "").trim();
  const message = String(formData.get("message") || "").trim();

  const fieldErrors: { name?: string; email?: string; company?: string; message?: string } = {};
  if (!name) fieldErrors.name = "Name is required.";
  if (!email || !EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid work email.";
  if (!company) fieldErrors.company = "Company is required.";
  if (!message) fieldErrors.message = "Tell us what you need.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await track("enterprise_contact_submitted", null, { name, email, company, volume, message });

  return { success: true };
}
