import { useState } from "react";
import { STEPS, StepId } from "./types";

export function useListingWizard(initialStep: StepId) {
  const [currentStep, setCurrentStep] = useState<StepId>(initialStep);
  const [maxStepReached, setMaxStepReached] = useState<StepId>(initialStep);

  const currentIndex = STEPS.indexOf(currentStep);
  const maxIndex = STEPS.indexOf(maxStepReached);

  function advanceTo(step: StepId) {
    setCurrentStep(step);
    if (STEPS.indexOf(step) > maxIndex) setMaxStepReached(step);
  }

  function goNextStep() {
    const next = STEPS[currentIndex + 1];
    if (next) advanceTo(next);
  }

  function goBack() {
    const prev = STEPS[currentIndex - 1];
    if (prev) setCurrentStep(prev);
  }

  function goToStep(step: StepId) {
    if (STEPS.indexOf(step) <= maxIndex) setCurrentStep(step);
  }

  function resetTo(step: StepId) {
    setCurrentStep(step);
    setMaxStepReached(step);
  }

  return {
    currentStep,
    maxStepReached,
    isFirst: currentIndex === 0,
    isLast: currentIndex === STEPS.length - 1,
    goNextStep,
    goBack,
    goToStep,
    resetTo,
  };
}
