"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEPS, STEP_LABELS, StepId } from "./types";

export function WizardStepper({
  currentStep,
  maxStepReached,
  onJump,
  disabled,
}: {
  currentStep: StepId;
  maxStepReached: StepId;
  onJump: (step: StepId) => void;
  disabled?: boolean;
}) {
  const currentIndex = STEPS.indexOf(currentStep);
  const maxIndex = STEPS.indexOf(maxStepReached);

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const isActive = step === currentStep;
        const isDone = i < maxIndex || (i <= maxIndex && i < currentIndex);
        const isReachable = i <= maxIndex && !disabled;
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => isReachable && onJump(step)}
              disabled={!isReachable}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground",
                !isReachable && !isActive && "cursor-not-allowed opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs",
                  isActive
                    ? "bg-primary-foreground/20"
                    : isDone
                    ? "bg-success text-success-foreground"
                    : "bg-muted"
                )}
              >
                {isDone && !isActive ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
