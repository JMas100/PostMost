"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updatePreferences, type UpdatablePreferences } from "@/lib/actions/notifications";

export function NotificationPreferenceToggle({
  field,
  initialValue,
}: {
  field: keyof UpdatablePreferences;
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      try {
        await updatePreferences({ [field]: next });
      } catch {
        setChecked(!next);
        toast.error("Couldn't save that preference.");
      }
    });
  }

  return <Switch checked={checked} onCheckedChange={handleChange} />;
}
