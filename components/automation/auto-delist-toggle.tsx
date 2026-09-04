"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setAutoDelistEnabled } from "@/lib/actions/accounts";

export function AutoDelistToggle({ accountId, initialEnabled }: { accountId: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const result = await setAutoDelistEnabled(accountId, next);
      if (result?.error) {
        setEnabled(!next);
        toast.error(result.error);
      }
    });
  }

  return <Switch checked={enabled} onCheckedChange={handleChange} />;
}
