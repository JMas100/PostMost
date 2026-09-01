"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMember, removeTeamMember } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Member = {
  id: string;
  email: string;
  role: string;
  status: string;
  userId: string | null;
};

type Team = {
  id: string;
  name: string;
  members: Member[];
} | null;

interface TeamClientProps {
  team: Team;
  viewerRole: "OWNER" | "ADMIN" | "MEMBER";
  viewerActingUserId: string;
}

export function TeamClient({ team, viewerRole, viewerActingUserId }: TeamClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  const canManageTeam = viewerRole === "OWNER" || viewerRole === "ADMIN";

  function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await inviteTeamMember(email, role);
      if (result && "error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success("Invite sent");
        setEmail("");
        router.refresh();
      }
    });
  }

  function remove(memberId: string, isSelf: boolean) {
    if (isSelf && !window.confirm("Leave this workspace? You'll lose access to its listings, inventory, and marketplace connections.")) {
      return;
    }
    startTransition(async () => {
      const result = await removeTeamMember(memberId);
      if (result && "error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success(isSelf ? "You left the workspace" : "Member removed");
        if (isSelf) {
          router.push("/dashboard");
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      {canManageTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Invite team member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select id="role" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")} className="w-full rounded-md border border-input bg-background px-3 py-2">
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={isPending}>Invite</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {team && team.members.length > 0 ? (
        <div className="space-y-3">
          {team.members.map((member) => {
            const isSelf = member.userId === viewerActingUserId;
            return (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">
                    {member.email}
                    {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{member.role}</Badge>
                    <span>{member.status === "PENDING" ? "Invite pending" : "Active"}</span>
                  </div>
                </div>
                {(canManageTeam || isSelf) && (
                  <Button variant="destructive" size="sm" onClick={() => remove(member.id, isSelf)} disabled={isPending}>
                    {isSelf ? "Leave" : "Remove"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !canManageTeam && <p className="text-sm text-muted-foreground">No other team members yet.</p>
      )}
    </div>
  );
}
