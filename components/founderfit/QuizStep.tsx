"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type QuizOption = {
  value: string;
  label: string;
  description?: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface QuizStepProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  question: string;
  helperText?: string;
  options: QuizOption[];
  multiSelect?: boolean;
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
  canGoBack: boolean;
  canContinue: boolean;
  isSubmitting?: boolean;
  saveStatus?: SaveStatus;
  saveMessage?: string;
}

function statusToneClass(status: SaveStatus): string {
  if (status === "saved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function StatusIcon({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (status === "saved") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (status === "error") {
    return <CircleAlert className="h-4 w-4" />;
  }

  return <Check className="h-4 w-4" />;
}

export function QuizStep({
  stepNumber,
  totalSteps,
  title,
  question,
  helperText,
  options,
  multiSelect = false,
  selectedValues,
  onChange,
  onBack,
  onContinue,
  canGoBack,
  canContinue,
  isSubmitting = false,
  saveStatus = "idle",
  saveMessage = "Progress auto-saves as you answer."
}: QuizStepProps) {
  function toggleOption(value: string) {
    if (multiSelect) {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter((item) => item !== value));
        return;
      }

      onChange([...selectedValues, value]);
      return;
    }

    onChange([value]);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <Card className="overflow-hidden border-indigo-100 bg-white/95 shadow-xl shadow-indigo-100/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/60 via-white to-emerald-50/60">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
              Question {stepNumber} of {totalSteps}
            </Badge>
            <Badge variant={multiSelect ? "outline" : "secondary"} className="text-slate-600">
              {multiSelect ? "Multi-select" : "Single-select"}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">{title}</p>
            <CardTitle className="text-2xl leading-tight text-slate-900 md:text-3xl">{question}</CardTitle>
            {helperText ? <p className="text-sm text-slate-600">{helperText}</p> : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-6">
          {options.map((option) => {
            const selected = selectedValues.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                aria-pressed={selected}
                className={cn(
                  "group w-full rounded-xl border p-4 text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                  selected
                    ? "border-indigo-400 bg-indigo-50 shadow-sm shadow-indigo-100"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{option.label}</p>
                    {option.description ? <p className="mt-1 text-sm text-slate-600">{option.description}</p> : null}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border",
                      selected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 text-transparent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-slate-100 bg-white px-6 py-5">
          <div className={cn("flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm", statusToneClass(saveStatus))}>
            <StatusIcon status={saveStatus} />
            <span>{saveMessage}</span>
          </div>

          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack} disabled={!canGoBack || isSubmitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <Button type="button" onClick={onContinue} disabled={!canContinue || isSubmitting} className="bg-indigo-600 hover:bg-indigo-500">
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
