"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptTeamInvite, acceptExistingUserInvite, getInviteInfo } from "@/lib/actions/team";
import { toast } from "sonner";
import { Wordmark, LogoMark } from "@/components/logo";

type InviteInfo = { email: string; isExistingUser: boolean; teamName: string };

function NewUserForm({ token, teamName }: { token: string; teamName: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    const result = await acceptTeamInvite(token, password);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Account created. Sign in to get started.");
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose a password to join <span className="font-medium text-foreground">{teamName}</span>.
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Choose a password</Label>
        <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Accept invite"}
      </Button>
    </form>
  );
}

function ExistingUserConfirm({ token, info }: { token: string; info: InviteInfo }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  if (status === "loading") {
    return <p className="text-center text-sm text-muted-foreground">Loading...</p>;
  }

  if (status !== "authenticated") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in as <span className="font-medium text-foreground">{info.email}</span> to accept
          this invite, then come back to this link.
        </p>
        <Link href="/login" className="text-sm underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (session.user?.email !== info.email) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in as {session.user?.email}, but this invite is for{" "}
          <span className="font-medium text-foreground">{info.email}</span>. Sign out and sign back
          in as that account to accept it.
        </p>
      </div>
    );
  }

  async function handleConfirm() {
    setLoading(true);
    const result = await acceptExistingUserInvite(token);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`You've joined ${info.teamName}.`);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        Join <span className="font-medium text-foreground">{info.teamName}</span>&apos;s workspace
        as {info.email}?
      </p>
      <Button className="w-full" onClick={handleConfirm} disabled={loading}>
        {loading ? "Joining..." : "Join workspace"}
      </Button>
    </div>
  );
}

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [info, setInfo] = useState<InviteInfo | null | undefined>(undefined);

  useEffect(() => {
    if (!token) return;
    getInviteInfo(token).then(setInfo);
  }, [token]);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">This invite link is missing its token.</p>
        <Link href="/login" className="text-sm underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (info === undefined) {
    return <p className="text-center text-sm text-muted-foreground">Loading...</p>;
  }

  if (info === null) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">This invite link is invalid or has expired.</p>
        <Link href="/login" className="text-sm underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return info.isExistingUser ? (
    <ExistingUserConfirm token={token} info={info} />
  ) : (
    <NewUserForm token={token} teamName={info.teamName} />
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
            <LogoMark className="h-7 w-7" />
            <Wordmark className="text-2xl" />
          </CardTitle>
          <CardDescription>You&apos;ve been invited to join a team</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <AcceptInviteForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
