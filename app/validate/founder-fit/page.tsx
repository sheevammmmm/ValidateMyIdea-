"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CircleAlert, Lightbulb, Loader2 } from "lucide-react";
import { saveFounderProfileAction } from "@/app/actions/saveFounderProfile";
import { QuizStep, type QuizOption } from "@/components/founderfit/QuizStep";
import { ResultsScreen } from "@/components/founderfit/ResultsScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BUDGET_OPTIONS,
  DOMAIN_EXPERTISE_OPTIONS,
  isFounderProfileComplete,
  KEY_SKILL_OPTIONS,
  type FounderFitResult,
  type FounderProfileDraft,
  TIME_COMMITMENT_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS
} from "@/lib/scoring/founderFit";

const QUIZ_STEPS = [
  {
    key: "domainExpertise",
    title: "Domain Expertise",
    question: "What industries do you have deep experience in?",
    helperText: "Pick all that apply. Industry context improves your founder-fit score.",
    multiSelect: true,
    options: DOMAIN_EXPERTISE_OPTIONS.map((option) => ({ value: option, label: option }))
  },
  {
    key: "yearsExperience",
    title: "Years of Experience",
    question: "How many years of relevant professional experience do you have?",
    helperText: "Select your closest range.",
    multiSelect: false,
    options: YEARS_EXPERIENCE_OPTIONS.map((option) => ({ value: option, label: option }))
  },
  {
    key: "keySkills",
    title: "Key Skills",
    question: "What are your strongest skills?",
    helperText: "Select your top execution strengths.",
    multiSelect: true,
    options: KEY_SKILL_OPTIONS.map((option) => ({ value: option, label: option }))
  },
  {
    key: "budget",
    title: "Budget for MVP",
    question: "What's your budget to build an MVP?",
    helperText: "This impacts the resource-readiness part of your score.",
    multiSelect: false,
    options: BUDGET_OPTIONS.map((option) => ({ value: option, label: option }))
  },
  {
    key: "timeCommitment",
    title: "Time Commitment",
    question: "How much time can you dedicate?",
    helperText: "Time availability affects MVP speed and learning loops.",
    multiSelect: false,
    options: TIME_COMMITMENT_OPTIONS.map((option) => ({ value: option, label: option }))
  }
] as const;

type QuizStepKey = (typeof QUIZ_STEPS)[number]["key"];

type SaveStatus = "idle" | "saving" | "saved" | "error";

const EMPTY_PROFILE: FounderProfileDraft = {
  domainExpertise: [],
  yearsExperience: undefined,
  keySkills: [],
  budget: undefined,
  timeCommitment: undefined
};

function hasAnyAnswer(profile: FounderProfileDraft): boolean {
  return (
    profile.domainExpertise.length > 0 ||
    profile.keySkills.length > 0 ||
    Boolean(profile.yearsExperience) ||
    Boolean(profile.budget) ||
    Boolean(profile.timeCommitment)
  );
}

function selectedValuesForStep(profile: FounderProfileDraft, stepKey: QuizStepKey): string[] {
  switch (stepKey) {
    case "domainExpertise":
      return profile.domainExpertise;
    case "yearsExperience":
      return profile.yearsExperience ? [profile.yearsExperience] : [];
    case "keySkills":
      return profile.keySkills;
    case "budget":
      return profile.budget ? [profile.budget] : [];
    case "timeCommitment":
      return profile.timeCommitment ? [profile.timeCommitment] : [];
    default:
      return [];
  }
}

function applySelectedValues(profile: FounderProfileDraft, stepKey: QuizStepKey, values: string[]): FounderProfileDraft {
  switch (stepKey) {
    case "domainExpertise":
      return {
        ...profile,
        domainExpertise: values as FounderProfileDraft["domainExpertise"]
      };
    case "yearsExperience":
      return {
        ...profile,
        yearsExperience: values[0] as FounderProfileDraft["yearsExperience"]
      };
    case "keySkills":
      return {
        ...profile,
        keySkills: values as FounderProfileDraft["keySkills"]
      };
    case "budget":
      return {
        ...profile,
        budget: values[0] as FounderProfileDraft["budget"]
      };
    case "timeCommitment":
      return {
        ...profile,
        timeCommitment: values[0] as FounderProfileDraft["timeCommitment"]
      };
    default:
      return profile;
  }
}

function saveMessageFor(status: SaveStatus, message: string): string {
  if (status === "saving") {
    return "Saving progress...";
  }

  if (status === "saved") {
    return message || "Progress saved.";
  }

  if (status === "error") {
    return message || "Could not save progress.";
  }

  return "Progress auto-saves every 2 seconds.";
}

export default function FounderFitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const validationId = searchParams.get("validationId") ?? undefined;

  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<FounderProfileDraft>(EMPTY_PROFILE);
  const [result, setResult] = useState<FounderFitResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, startSavingTransition] = useTransition();
  const [isSubmitting, startSubmittingTransition] = useTransition();
  const saveSequenceRef = useRef(0);

  const currentStep = QUIZ_STEPS[stepIndex];
  const selectedValues = selectedValuesForStep(profile, currentStep.key);
  const canContinue = selectedValues.length > 0;
  const progressPercentage = result ? 100 : Math.round(((stepIndex + 1) / QUIZ_STEPS.length) * 100);

  const saveBannerText = useMemo(() => saveMessageFor(saveStatus, saveMessage), [saveStatus, saveMessage]);

  useEffect(() => {
    if (!hasAnyAnswer(profile) || result) {
      return;
    }

    setSaveStatus("saving");

    const timeoutId = setTimeout(() => {
      const currentSequence = ++saveSequenceRef.current;

      startSavingTransition(async () => {
        const response = await saveFounderProfileAction({
          ...profile,
          validationId,
          mode: "autosave"
        });

        if (currentSequence !== saveSequenceRef.current) {
          return;
        }

        if (!response.ok) {
          setSaveStatus("error");
          setSaveMessage(response.message);
          return;
        }

        setSaveStatus("saved");
        setSaveMessage(response.savedAt ? `Saved at ${new Date(response.savedAt).toLocaleTimeString()}` : response.message);
      });
    }, 2200);

    return () => clearTimeout(timeoutId);
  }, [profile, result, validationId, startSavingTransition]);

  function handleStepChange(nextValues: string[]) {
    setProfile((prev) => applySelectedValues(prev, currentStep.key, nextValues));
  }

  function handleBack() {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
      return;
    }

    router.push("/validate");
  }

  function handleContinue() {
    if (!canContinue) {
      return;
    }

    if (stepIndex < QUIZ_STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
      return;
    }

    if (!isFounderProfileComplete(profile)) {
      setSaveStatus("error");
      setSaveMessage("Please complete all questions before viewing your result.");
      return;
    }

    const completeProfile = profile;

    startSubmittingTransition(async () => {
      setSaveStatus("saving");

      const response = await saveFounderProfileAction({
        ...completeProfile,
        validationId,
        mode: "complete"
      });

      if (!response.ok || !response.founderFit) {
        setSaveStatus("error");
        setSaveMessage(response.message || "Could not compute founder-fit score.");
        return;
      }

      setSaveStatus("saved");
      setSaveMessage(response.message);
      setResult(response.founderFit);
    });
  }

  function handleRetake() {
    setResult(null);
    setStepIndex(0);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-emerald-50/60 py-8 md:py-12">
      <div className="container max-w-4xl space-y-6">
        <div className="rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm md:p-5">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Step 2 of 3</span>
            <span>Founder Fit Quiz</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>

        <Card className="border-indigo-100 bg-white/90 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="ghost" className="w-fit gap-2 px-0 text-slate-600 hover:bg-transparent hover:text-slate-900">
              <Link href="/validate">
                <ArrowLeft className="h-4 w-4" /> Back to Idea Input
              </Link>
            </Button>

            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
              <span>{saveBannerText}</span>
            </div>
          </CardContent>
        </Card>

        {!validationId ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <CircleAlert className="h-4 w-4" />
            Missing `validationId` in URL. Score will be saved to your profile but not linked to an idea draft.
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          {result ? (
            <motion.div key="results" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <ResultsScreen result={result} onRetake={handleRetake} onContinue={() => router.push("/dashboard")} />
            </motion.div>
          ) : (
            <motion.div key={currentStep.key} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <QuizStep
                stepNumber={stepIndex + 1}
                totalSteps={QUIZ_STEPS.length}
                title={currentStep.title}
                question={currentStep.question}
                helperText={currentStep.helperText}
                options={currentStep.options as QuizOption[]}
                multiSelect={currentStep.multiSelect}
                selectedValues={selectedValues}
                onChange={handleStepChange}
                onBack={handleBack}
                onContinue={handleContinue}
                canGoBack
                canContinue={canContinue}
                isSubmitting={isSubmitting}
                saveStatus={saveStatus}
                saveMessage={saveBannerText}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
