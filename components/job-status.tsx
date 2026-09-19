import { formatDistanceToNow } from "date-fns";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { cn } from "@/lib/utils";

type JobType = "POST" | "DELIST" | "RELIST";
type JobState = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

interface Job {
  id: string;
  platform: string;
  type: string;
  status: string;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

const DOT_COLOR: Record<JobState, string> = {
  PENDING: "bg-muted-foreground/40",
  RUNNING: "bg-info",
  COMPLETED: "bg-success",
  FAILED: "bg-warning",
};

function narrative(job: Job): string {
  const name = getPlatform(job.platform)?.name ?? job.platform;
  const state = (job.status in DOT_COLOR ? job.status : "PENDING") as JobState;
  const verb: Record<JobType, Record<JobState, string>> = {
    POST: {
      COMPLETED: `Published to ${name}`,
      FAILED: `${name} publish failed${job.error ? ` — ${job.error}` : ""}`,
      RUNNING: `Publishing to ${name}...`,
      PENDING: `Queued for ${name}`,
    },
    DELIST: {
      COMPLETED: `Delisted from ${name}`,
      FAILED: `Couldn't delist from ${name}${job.error ? ` — ${job.error}` : ""}`,
      RUNNING: `Delisting from ${name}...`,
      PENDING: `Delist queued for ${name}`,
    },
    RELIST: {
      COMPLETED: `Relisted on ${name}`,
      FAILED: `Couldn't relist on ${name}${job.error ? ` — ${job.error}` : ""}`,
      RUNNING: `Relisting on ${name}...`,
      PENDING: `Relist queued for ${name}`,
    },
  };
  const type = (job.type in verb ? job.type : "POST") as JobType;
  return verb[type][state];
}

function TimelineRow({ dotColor, headline, meta, isLast }: { dotColor: string; headline: string; meta: string; isLast: boolean }) {
  return (
    <div
      className={cn("relative ml-[5px] flex gap-3.5 border-l pl-[18px]", isLast ? "border-transparent pb-0" : "border-border pb-4")}
    >
      <span className={cn("absolute -left-[4.5px] top-1 h-[9px] w-[9px] rounded-full", dotColor)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{headline}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
}

/** A real connected-line timeline, newest first -- each job's own line segment reaches down to
 *  the next row's dot, so the sequence of what happened to this listing reads as one continuous
 *  thread rather than a stack of disconnected badges. Ends on a synthetic "Listing created" row
 *  (no CrossPostJob backs it) so the thread always has a beginning. */
export function JobTimeline({ jobs, listingCreatedAt }: { jobs: Job[]; listingCreatedAt: Date }) {
  return (
    <div className="flex flex-col">
      {jobs.map((job) => {
        const state = (job.status in DOT_COLOR ? job.status : "PENDING") as JobState;
        const metaParts = [formatDistanceToNow(job.createdAt, { addSuffix: true })];
        if (job.attempts > 1) metaParts.push(`attempt ${job.attempts} of ${job.maxAttempts}`);
        return (
          <TimelineRow
            key={job.id}
            dotColor={DOT_COLOR[state]}
            headline={narrative(job)}
            meta={metaParts.join(" · ")}
            isLast={false}
          />
        );
      })}
      <TimelineRow
        dotColor="bg-muted-foreground/40"
        headline="Listing created"
        meta={formatDistanceToNow(listingCreatedAt, { addSuffix: true })}
        isLast
      />
    </div>
  );
}
