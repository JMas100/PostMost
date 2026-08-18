"use client";

import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export function WizardNav({
  isFirst,
  isLast,
  onBack,
  onNext,
  onSubmitClick,
  onSaveDraft,
  saving,
  submitLabel,
  isSubmitting,
  navDisabled,
}: {
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmitClick: () => void;
  onSaveDraft: () => void;
  saving: boolean;
  submitLabel: string;
  isSubmitting: boolean;
  navDisabled: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="outline" onClick={onSaveDraft} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save as draft"}
      </Button>

      <div className="flex gap-3">
        {!isFirst && (
          <Button type="button" variant="ghost" onClick={onBack} disabled={navDisabled}>
            Back
          </Button>
        )}
        {isLast ? (
          <Button type="button" onClick={onSubmitClick} disabled={isSubmitting || navDisabled}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={onNext} disabled={navDisabled}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
