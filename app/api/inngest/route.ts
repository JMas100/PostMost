import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processCrossPostJobs, runAutomationRules, sendNotificationDigest } from "@/lib/inngest/functions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Same ceiling /api/jobs/run had -- processCrossPostJobs' batch loop needs the room.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processCrossPostJobs, runAutomationRules, sendNotificationDigest],
});
