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
};

type Team = {
  id: string;
  name: string;
  members: Member[];
} | null;

interface TeamClientProps {
  team: Team;
}

export function TeamClient({ team }: TeamClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

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

  function remove(memberId: string) {
    startTransition(async () => {
      const result = await removeTeamMember(memberId);
      if (result && "error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success("Member removed");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
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

      {team && team.members.length > 0 && (
        <div className="space-y-3">
          {team.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{member.email}</p>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{member.role}</Badge>
                  <span>{member.status}</span>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => remove(member.id)}>Remove</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
