import { Inngest } from "inngest";

/** Single client shared by every function in lib/inngest/functions.ts and by every caller that
 *  sends an event (lib/jobs/trigger.ts). Reads INNGEST_EVENT_KEY/INNGEST_SIGNING_KEY from the
 *  environment automatically -- unset locally, the SDK talks to the local Inngest dev server
 *  (`npx inngest-cli@latest dev`) instead. */
export const inngest = new Inngest({ id: "postmost" });
