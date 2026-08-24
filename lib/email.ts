/** Normalizes an email for storage/lookup so "Demo@x.com" and "demo@x.com" are the same
 *  account everywhere -- registration, login, and team invites all funnel through this. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
