"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { createApiKey, deleteApiKey } from "@/lib/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Key {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface ApiClientProps {
  keys: Key[];
}

export function ApiClient({ keys }: ApiClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createApiKey(name);
      if (result && "error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success("API key created");
        setName("");
        setNewKey(result.apiKey.key);
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteApiKey(id);
      router.refresh();
      toast.success("API key deleted");
    });
  }

  function copy(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-6">
      {newKey && (
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle>Copy your new API key now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              This is the only time the full key will be shown. Store it somewhere safe.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{newKey}</code>
              <Button variant="outline" size="sm" onClick={() => copy(newKey)}>Copy</Button>
              <Button variant="outline" size="sm" onClick={() => setNewKey(null)}>Dismiss</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>New API key</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zapier integration" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isPending}>Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {keys.length > 0 && (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(k.createdAt).toLocaleDateString()} ·{" "}
                    {k.lastUsedAt ? `last used ${formatDistanceToNow(k.lastUsedAt, { addSuffix: true })}` : "never used"}
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => remove(k.id)}>Delete</Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{k.keyPrefix}...</code>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><code className="rounded bg-muted px-1 py-0.5">POST /api/v1/listings</code> — Create one or many listings.</p>
          <p>Include header: <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer YOUR_API_KEY</code></p>
        </CardContent>
      </Card>
    </div>
  );
}
