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
  nextStepLabel,
  hideForward = false,
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
  nextStepLabel?: string;
  /** The Photos step owns its own two exits (Write it for me / I'll write it myself) --
   *  a second, generic Next here would be the "two competing forward actions" problem the
   *  redesign explicitly rules out. */
  hideForward?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="outline" onClick={onSaveDraft} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save as draft"}
      </Button>

      <div className="flex flex-1 gap-3 sm:flex-none sm:justify-end">
        {!isFirst && (
          <Button type="button" variant="ghost" onClick={onBack} disabled={navDisabled} className="shrink-0">
            Back
          </Button>
        )}
        {hideForward ? null : isLast ? (
          // The one control on this whole form that actually puts the listing live deserves to
          // look different from every "advance to the next step" Next before it, not share its size.
          <Button
            type="button"
            size="lg"
            className="flex-1 sm:min-w-64 sm:flex-none"
            onClick={onSubmitClick}
            disabled={isSubmitting || navDisabled}
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={onNext} disabled={navDisabled}>
            {nextStepLabel ? `Next: ${nextStepLabel}` : "Next"}
          </Button>
        )}
      </div>
    </div>
  );
}
