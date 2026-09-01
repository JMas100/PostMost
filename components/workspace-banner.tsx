"use client";

import { useEffect, useState } from "react";
import { getWorkspaceContext } from "@/lib/actions/team";
import { Users } from "lucide-react";

type Context = { role: "ADMIN" | "MEMBER"; ownerName: string } | null;

/** Renders nothing for a workspace owner -- there's nothing to explain. For an active team
 *  member, the shared-workspace model is otherwise completely invisible (their own account
 *  looks identical to the owner's), so this is the one persistent cue that what they're seeing
 *  belongs to someone else's workspace. */
export function WorkspaceBanner() {
  const [ctx, setCtx] = useState<Context>(null);

  useEffect(() => {
    getWorkspaceContext().then(setCtx).catch(() => {});
  }, []);

  if (!ctx) return null;

  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5 shrink-0" />
      <span>
        Working in <span className="font-medium text-foreground">{ctx.ownerName}</span>&apos;s workspace ·{" "}
        {ctx.role === "ADMIN" ? "Admin" : "Member"}
      </span>
    </div>
  );
}
