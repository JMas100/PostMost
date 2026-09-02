import { inngest } from "@/lib/inngest/client";

/** Sends the event that kicks off processCrossPostJobs (see lib/inngest/functions.ts) so the
 *  caller can return immediately. Unlike the old fire-and-forget fetch this replaced, a
 *  successfully-sent Inngest event is durable -- Inngest guarantees the function actually runs,
 *  it doesn't just best-effort attempt an HTTP call and silently drop on failure. The function's
 *  own 5-minute cron trigger is still the backstop for the rare case the send itself fails (a
 *  real network error at send time, not "the invocation died after accepting the request" --
 *  the old failure mode this was built to close). */
export function triggerJobWorker(listingId?: string) {
  void inngest.send({ name: "crosspost/trigger", data: listingId ? { listingId } : {} }).catch(() => {
    // Best-effort; the function's own cron trigger picks up any job this missed within 5 minutes.
  });
}
