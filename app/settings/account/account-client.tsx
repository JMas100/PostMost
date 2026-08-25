"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, changePassword } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export function AccountClient({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [profileName, setProfileName] = useState(name);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function saveProfile() {
    startTransition(async () => {
      const result = await updateProfile(profileName);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated");
        router.refresh();
      }
    });
  }

  function savePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    startTransition(async () => {
      const result = await changePassword(currentPassword, newPassword);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Password updated");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          </div>
          <Button onClick={saveProfile} disabled={isPending}>
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={savePassword}
            disabled={isPending || !currentPassword || !newPassword}
          >
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
