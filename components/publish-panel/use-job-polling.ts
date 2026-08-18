"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCrossPostJobs } from "@/lib/actions/crosspost";

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING"]);
const POLL_MS = 3500;

export function useJobPolling(listingId: string, hasActiveJobs: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!hasActiveJobs) return;

    const id = setInterval(async () => {
      const jobs = await getCrossPostJobs(listingId);
      const stillActive = jobs.some(
        (j) => j.listingId === listingId && ACTIVE_STATUSES.has(j.status)
      );
      router.refresh();
      if (!stillActive) clearInterval(id);
    }, POLL_MS);

    return () => clearInterval(id);
  }, [listingId, hasActiveJobs, router]);
}
