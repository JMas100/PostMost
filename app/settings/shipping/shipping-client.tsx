"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShippingProfile, updateShippingProfile, deleteShippingProfile } from "@/lib/actions/shipping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Profile = {
  id: string;
  name: string;
  carrier: string;
  service: string;
  cost: number;
  isDefault: boolean;
};

interface ShippingClientProps {
  profiles: Profile[];
}

export function ShippingClient({ profiles }: ShippingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", carrier: "USPS", service: "", cost: "", isDefault: false });

  function reset() {
    setEditing(null);
    setForm({ name: "", carrier: "USPS", service: "", cost: "", isDefault: false });
  }

  function edit(profile: Profile) {
    setEditing(profile);
    setForm({ name: profile.name, carrier: profile.carrier, service: profile.service, cost: profile.cost.toString(), isDefault: profile.isDefault });
  }

  function save() {
    startTransition(async () => {
      const data = {
        name: form.name,
        carrier: form.carrier,
        service: form.service,
        cost: Number(form.cost) || 0,
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              <select
                id="carrier"
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                {["USPS", "UPS", "FedEx", "DHL", "Other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
              <Input id="service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (USD)</Label>
              <Input id="cost" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
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
            <div key={profile.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{profile.name}</p>
                  {profile.isDefault && <Badge>Default</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{profile.carrier} {profile.service} · ${profile.cost.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => edit(profile)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => remove(profile.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
