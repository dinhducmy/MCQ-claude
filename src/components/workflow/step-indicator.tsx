import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepDef {
  id: number;
  label: string;
}

interface StepIndicatorProps {
  steps: StepDef[];
  currentStep: number;
  maxUnlockedStep: number;
}

export function StepIndicator({
  steps,
  currentStep,
  maxUnlockedStep,
}: StepIndicatorProps) {
  return (
    <ol className="flex w-full items-center overflow-x-auto">
      {steps.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isActive = step.id === currentStep;
        const isLocked = step.id > maxUnlockedStep;
        return (
          <li
            key={step.id}
            className={cn(
              "flex items-center",
              idx !== steps.length - 1 && "flex-1",
            )}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isCompleted &&
                    !isActive &&
                    "border-primary bg-primary/10 text-primary",
                  !isActive &&
                    !isCompleted &&
                    "border-muted-foreground/30 text-muted-foreground",
                  isLocked && "opacity-50",
                )}
              >
                {isCompleted ? <Check className="size-4" /> : step.id}
              </div>
              <span
                className={cn(
                  "w-max max-w-20 text-center text-xs whitespace-normal",
                  isActive ? "font-medium text-foreground" : "text-muted-foreground",
                  isLocked && "opacity-50",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx !== steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-px flex-1",
                  isCompleted ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
