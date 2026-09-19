"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShippingProfile, updateShippingProfile, deleteShippingProfile } from "@/lib/actions/shipping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformLogo } from "@/components/platform-logo";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type Profile = {
  id: string;
  name: string;
  whoPays: string;
  cost: number;
  handlingTimeDays: number;
  maxWeightLbs: number | null;
  isDefault: boolean;
  platforms: string[];
  _count?: { listings: number };
};

interface ShippingClientProps {
  profiles: Profile[];
}

const EMPTY_FORM = { name: "", whoPays: "seller", cost: "", handlingTimeDays: "1", maxWeightLbs: "", isDefault: false };

export function ShippingClient({ profiles }: ShippingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function reset() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function edit(profile: Profile) {
    setEditing(profile);
    setForm({
      name: profile.name,
      whoPays: profile.whoPays,
      cost: profile.cost.toString(),
      handlingTimeDays: profile.handlingTimeDays.toString(),
      maxWeightLbs: profile.maxWeightLbs?.toString() ?? "",
      isDefault: profile.isDefault,
    });
  }

  function save() {
    startTransition(async () => {
      const data = {
        name: form.name,
        whoPays: form.whoPays,
        cost: Number(form.cost) || 0,
        handlingTimeDays: Number(form.handlingTimeDays) || 1,
        maxWeightLbs: form.maxWeightLbs.trim() ? Number(form.maxWeightLbs) : null,
        isDefault: form.isDefault,
      };
      const result = editing
        ? await updateShippingProfile(editing.id, data)
        : await createShippingProfile(data);
      if (result && "error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success(editing ? "Profile updated" : "Profile created");
        reset();
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteShippingProfile(id);
      router.refresh();
      toast.success("Profile deleted");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit profile" : "New profile"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Standard" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whoPays">Who pays</Label>
              <select
                id="whoPays"
                value={form.whoPays}
                onChange={(e) => setForm({ ...form, whoPays: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="seller">Seller (free shipping)</option>
                <option value="buyer">Buyer pays</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost to buyer (USD)</Label>
              <Input id="cost" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="handlingTimeDays">Handling time (days)</Label>
              <Input
                id="handlingTimeDays"
                type="number"
                min={0}
                value={form.handlingTimeDays}
                onChange={(e) => setForm({ ...form, handlingTimeDays: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxWeightLbs">Max weight (lbs)</Label>
              <Input
                id="maxWeightLbs"
                type="number"
                step="0.1"
                placeholder="No limit"
                value={form.maxWeightLbs}
                onChange={(e) => setForm({ ...form, maxWeightLbs: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded border-input"
            />
            Default profile
          </label>
          <div className="flex gap-2">
            <Button onClick={save} disabled={isPending}>{editing ? "Update" : "Create"}</Button>
            {editing && <Button variant="outline" onClick={reset}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      {profiles.length > 0 && (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{profile.name}</p>
                      {profile.isDefault && <Badge variant="live">Default</Badge>}
                    </div>
                    <p className="tnum text-sm text-muted-foreground">
                      {profile.whoPays === "seller" ? "Free shipping" : "Buyer pays"} · {formatCurrency(profile.cost)} ·{" "}
                      {profile.handlingTimeDays} day{profile.handlingTimeDays === 1 ? "" : "s"} handling
                      {profile.maxWeightLbs ? ` · up to ${profile.maxWeightLbs} lbs` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => edit(profile)}>Edit</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (profile._count?.listings) {
                          if (!window.confirm(`${profile._count.listings} listing${profile._count.listings === 1 ? "" : "s"} use this profile. Delete anyway?`)) return;
                        }
                        remove(profile.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {/* A profile is abstract until you know which marketplaces map to it and how many
                    live listings depend on it -- this footer is what makes deleting one safe to
                    reason about. */}
                <div className="flex items-center gap-2 border-t pt-3">
                  {profile.platforms.length > 0 ? (
                    <div className="flex -space-x-1.5">
                      {profile.platforms.map((platform) => (
                        <PlatformLogo key={platform} platform={platform} size={20} onDark showLabel={false} />
                      ))}
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {profile._count?.listings
                      ? `Used on ${profile._count.listings} listing${profile._count.listings === 1 ? "" : "s"}`
                      : "Not used on any listings yet"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
