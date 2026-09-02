/** Kicks the job worker in a separate invocation so the caller can return immediately.
 *  The Vercel cron on /api/jobs/run is the durable backstop if this trigger fails. */
export function triggerJobWorker(listingId?: string) {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
  const triggerSecret = process.env.JOB_TRIGGER_SECRET;
  if (!baseUrl || !triggerSecret) return;

  void fetch(`${baseUrl.replace(/\/$/, "")}/api/jobs/run`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-job-trigger-secret": triggerSecret },
    body: JSON.stringify(listingId ? { listingId } : {}),
    cache: "no-store",
  }).catch(() => {
    // Best-effort trigger; the cron will pick the jobs up regardless.
  });
}
