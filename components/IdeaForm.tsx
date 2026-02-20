"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PollingStatus = "idle" | "submitting" | "processing" | "done" | "failed";

type ValidationStatusResponse =
  | { status: "processing" }
  | { status: "done"; result: unknown }
  | { status: "failed" };

type AnalysisVerdict = "BUILD" | "PIVOT" | "PASS";
type ConfidenceLevel = "Low" | "Medium" | "High";

interface AnalysisResult {
  verdict: AnalysisVerdict;
  reasoning: string;
  opportunities: string[];
  risks: string[];
  confidence: ConfidenceLevel;
}

interface ValidationResultPayload {
  analysis: AnalysisResult;
  processed_at?: string;
}

interface InsertValidationResponse {
  id: string;
}

interface DirectValidateResponse {
  success: boolean;
  analysis?: {
    verdict: AnalysisVerdict;
    summary: string;
    nextSteps: string[];
    confidence: number;
  };
  signals?: {
    risks?: string[];
  };
  error?: string;
}

const MAX_CHARS = 2000;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AnalysisResult>;

  return (
    (candidate.verdict === "BUILD" || candidate.verdict === "PIVOT" || candidate.verdict === "PASS") &&
    typeof candidate.reasoning === "string" &&
    isStringArray(candidate.opportunities) &&
    isStringArray(candidate.risks) &&
    (candidate.confidence === "Low" || candidate.confidence === "Medium" || candidate.confidence === "High")
  );
}

function parseValidationResult(value: unknown): ValidationResultPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ValidationResultPayload> & { analysis?: unknown };

  if (!isAnalysisResult(candidate.analysis)) {
    return null;
  }

  return {
    analysis: candidate.analysis,
    processed_at: typeof candidate.processed_at === "string" ? candidate.processed_at : undefined
  };
}

function verdictTone(verdict: AnalysisVerdict): string {
  if (verdict === "BUILD") return "text-emerald-700 bg-emerald-100 border-emerald-200";
  if (verdict === "PIVOT") return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-rose-700 bg-rose-100 border-rose-200";
}

function confidenceTone(confidence: ConfidenceLevel): string {
  if (confidence === "High") return "text-emerald-700";
  if (confidence === "Medium") return "text-amber-700";
  return "text-rose-700";
}

function mapNumericConfidence(score: number): ConfidenceLevel {
  if (score >= 0.75) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

export default function IdeaForm() {
  const [email, setEmail] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [status, setStatus] = useState<PollingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationId, setValidationId] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResultPayload | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBusy = status === "submitting" || status === "processing";

  const ideaCharCount = ideaText.length;
  const processingMessage = "Analyzing discussions and generating your report...";
  const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const requestRef = useMemo(() => {
    if (!validationId) return null;
    return validationId.slice(0, 8);
  }, [validationId]);

  function clearPollingInterval() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  async function pollStatus(currentValidationId: string) {
    try {
      const response = await fetch(`/api/status/${currentValidationId}`, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to poll status");
      }

      const payload = (await response.json()) as ValidationStatusResponse;

      if (payload.status === "done") {
        const parsed = parseValidationResult(payload.result);

        if (!parsed) {
          setStatus("failed");
          setErrorMessage("Validation completed but result format is invalid.");
          clearPollingInterval();
          return;
        }

        setResult(parsed);
        setStatus("done");
        setErrorMessage("");
        clearPollingInterval();
        return;
      }

      if (payload.status === "failed") {
        setStatus("failed");
        setErrorMessage("Validation processing failed. Please try again.");
        clearPollingInterval();
        return;
      }

      setStatus("processing");
    } catch {
      setStatus("failed");
      setErrorMessage("Unable to retrieve processing status. Please retry.");
      clearPollingInterval();
    }
  }

  function startPolling(currentValidationId: string) {
    clearPollingInterval();

    pollStatus(currentValidationId);

    pollIntervalRef.current = setInterval(() => {
      pollStatus(currentValidationId);
    }, 3000);
  }

  async function runDirectValidation(trimmedIdea: string, trimmedIndustry?: string) {
    setStatus("processing");

    const response = await fetch("/api/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        idea: trimmedIdea,
        industry: trimmedIndustry || "General"
      })
    });

    if (!response.ok) {
      throw new Error("Direct validation request failed");
    }

    const payload = (await response.json()) as DirectValidateResponse;
    if (!payload.success || !payload.analysis) {
      throw new Error(payload.error || "Validation failed");
    }

    const mapped: ValidationResultPayload = {
      analysis: {
        verdict: payload.analysis.verdict,
        reasoning: payload.analysis.summary,
        opportunities: payload.analysis.nextSteps,
        risks: payload.signals?.risks ?? [],
        confidence: mapNumericConfidence(payload.analysis.confidence)
      },
      processed_at: new Date().toISOString()
    };

    setResult(mapped);
    setStatus("done");
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedIdea = ideaText.trim();

    if (!trimmedEmail || !trimmedIdea) {
      setErrorMessage("Email and idea are required.");
      return;
    }

    if (trimmedIdea.length < 20) {
      setErrorMessage("Please add at least 20 characters so we have enough context.");
      return;
    }

    clearPollingInterval();
    setStatus("submitting");
    setErrorMessage("");
    setResult(null);

    try {
      if (!hasSupabaseConfig) {
        await runDirectValidation(trimmedIdea);
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("validations")
        .insert({
          email: trimmedEmail,
          idea_text: trimmedIdea
        })
        .select("id")
        .single<InsertValidationResponse>();

      if (error || !data?.id) {
        throw new Error(error?.message ?? "Failed to create validation.");
      }

      const createdValidationId = data.id;
      setValidationId(createdValidationId);
      setStatus("processing");

      fetch(`/api/process/${createdValidationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }).catch(() => {
        // Polling will capture terminal failure states.
      });

      startPolling(createdValidationId);
    } catch {
      try {
        await runDirectValidation(trimmedIdea);
      } catch {
        setStatus("failed");
        setErrorMessage("Unable to submit validation request. Please try again.");
      }
    }
  }

  function handleReset() {
    clearPollingInterval();
    setStatus("idle");
    setErrorMessage("");
    setResult(null);
    setValidationId(null);
  }

  useEffect(() => {
    return () => {
      clearPollingInterval();
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/60 sm:p-8">
      <div className="space-y-1">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">Start your validation</h1>
        <p className="text-sm text-slate-600">We scan real discussions, then generate a skeptical go/no-go report for your idea.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="idea" className="text-sm font-semibold text-slate-900">
              Idea Description
            </label>
            <span className="text-sm text-slate-500">
              {ideaCharCount}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            id="idea"
            value={ideaText}
            onChange={(event) => setIdeaText(event.target.value.slice(0, MAX_CHARS))}
            placeholder="Describe your startup idea in 2-3 sentences. What problem does it solve and for whom?"
            rows={7}
            required
            disabled={isBusy}
            className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <p className="text-sm text-slate-500">Minimum 20 characters.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-900">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
            disabled={isBusy}
            className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex h-12 items-center justify-center rounded-full bg-slate-800 px-10 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "Submitting..." : status === "processing" ? "Processing..." : "Submit for Validation"}
          </button>

          {status === "done" ? (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 px-8 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Validate another idea
            </button>
          ) : null}
        </div>
      </form>

      {requestRef && status === "processing" ? (
        <p className="mt-4 text-xs text-slate-500">Request reference: {requestRef}</p>
      ) : null}

      {status === "processing" ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-indigo-700" role="status" aria-live="polite">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" aria-hidden="true" />
          <span className="text-sm font-medium">{processingMessage}</span>
        </div>
      ) : null}

      {status === "failed" ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700" role="alert">
          {errorMessage || "Validation failed."}
        </div>
      ) : null}

      {status === "done" && result ? (
        <section className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verdict</p>
              <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">{result.analysis.verdict}</p>
            </div>
            <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${verdictTone(result.analysis.verdict)}`}>
              {result.analysis.verdict}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Reasoning</h3>
            <p className="text-base leading-relaxed text-slate-700">{result.analysis.reasoning}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Opportunities</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {result.analysis.opportunities.length > 0 ? (
                  result.analysis.opportunities.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>No major opportunities identified yet.</li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Risks</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {result.analysis.risks.length > 0 ? result.analysis.risks.map((item) => <li key={item}>{item}</li>) : <li>No major risks flagged.</li>}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">Confidence level</span>
            <span className={`text-sm font-bold ${confidenceTone(result.analysis.confidence)}`}>{result.analysis.confidence}</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
