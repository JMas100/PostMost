"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { createApiKey, revokeApiKey } from "@/lib/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Key {
  id: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  lastUsedAt: Date | null;
  callsThisMonth: number;
  revokedAt: Date | null;
  createdAt: Date;
}

interface ApiClientProps {
  keys: Key[];
}

// There's only one endpoint in this API today (see the usage card below), so every key's scope
// is genuinely this fixed string -- not a stored field standing in for a scoping system that
// doesn't exist yet.
const SCOPE_LABEL = "read + write listings";

function maskedKey(k: Key) {
  const dots = "·".repeat(24);
  return k.keySuffix ? `${k.keyPrefix}${dots}${k.keySuffix}` : `${k.keyPrefix}${dots}`;
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

  function revoke(id: string) {
    if (!window.confirm("Revoke this key? Anything still using it will stop working immediately.")) return;
    startTransition(async () => {
      await revokeApiKey(id);
      router.refresh();
      toast.success("API key revoked");
    });
  }

  function copy(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-6">
      {newKey && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Copy it now — this is the only time you&apos;ll see it</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              We store a hash, not the key itself — if you lose it, you&apos;ll need to create a new one.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{newKey}</code>
              <Button size="sm" onClick={() => copy(newKey)}>Copy</Button>
              <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>Dismiss</Button>
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
          {keys.map((k) => {
            const revoked = !!k.revokedAt;
            return (
              <Card key={k.id} className={revoked ? "opacity-70" : undefined}>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{k.name}</p>
                        {revoked && (
                          <Badge variant="outline" className="shrink-0 text-muted-foreground">
                            REVOKED
                          </Badge>
                        )}
                      </div>
                      <code className="mt-1 block truncate text-xs text-muted-foreground">{maskedKey(k)}</code>
                    </div>
                    {!revoked && (
                      <Button variant="ghost" size="sm" className="shrink-0 text-destructive hover:text-destructive" onClick={() => revoke(k.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                  <div className="tnum mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
                    <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    {revoked ? (
                      <span>Revoked {new Date(k.revokedAt!).toLocaleDateString()}</span>
                    ) : (
                      <>
                        <span>
                          Last used{" "}
                          <span className="text-foreground">
                            {k.lastUsedAt ? formatDistanceToNow(k.lastUsedAt, { addSuffix: true }) : "never"}
                          </span>
                        </span>
                        <span>
                          <span className="text-foreground">{k.callsThisMonth}</span> call{k.callsThisMonth === 1 ? "" : "s"} this month
                        </span>
                        <span>
                          Scope <span className="text-foreground">{SCOPE_LABEL}</span>
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
