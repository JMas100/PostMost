"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setStockSyncEnabled } from "@/lib/actions/automation";

export function StockSyncToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const result = await setStockSyncEnabled(next);
      if (result?.error) {
        setEnabled(!next);
        toast.error(result.error);
      }
    });
  }

  return <Switch checked={enabled} onCheckedChange={handleChange} />;
}
