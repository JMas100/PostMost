import { Badge } from "@/components/ui/badge";

type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

const statusMap: Record<JobStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

const variantMap: Record<JobStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  RUNNING: "default",
  COMPLETED: "default",
  FAILED: "destructive",
};

interface Job {
  id: string;
  platform: string;
  status: string;
  error: string | null;
}

export function JobStatus({ job }: { job: Job }) {
  const safeStatus = (statusMap[job.status as JobStatus] ? job.status : "PENDING") as JobStatus;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant={variantMap[safeStatus]}>{statusMap[safeStatus]}</Badge>
      <span className="text-muted-foreground">{job.platform}</span>
      {job.error && <span className="text-destructive">— {job.error}</span>}
    </div>
  );
}
