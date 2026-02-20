"use client";

type Signal = {
  text: string;
  source: string;
  engagement: number;
  url: string;
};

type AnalysisResult = {
  verdict: "BUILD" | "PIVOT" | "PASS";
  reasoning: string;
  opportunities: string[];
  risks: string[];
  confidence: "Low" | "Medium" | "High";
};

type ReportProps = {
  result: {
    signals: Signal[];
    analysis: AnalysisResult;
  };
};

function clampText(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function normalizeSignal(signal: Signal): Signal {
  return {
    text: typeof signal.text === "string" ? signal.text.trim() : "",
    source: typeof signal.source === "string" && signal.source.trim() ? signal.source.trim() : "unknown",
    engagement: Number.isFinite(signal.engagement) ? Math.max(0, Math.round(signal.engagement)) : 0,
    url: typeof signal.url === "string" ? signal.url : ""
  };
}

function getSourceLabel(source: string): string {
  const normalized = source.trim().toLowerCase();

  if (normalized === "hn") {
    return "Hacker News";
  }

  if (normalized === "reddit") {
    return "Reddit";
  }

  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function Report({ result }: ReportProps) {
  const safeSignals = Array.isArray(result?.signals) ? result.signals.map(normalizeSignal).filter((signal) => signal.text) : [];

  const sourcesInvolved = new Set(safeSignals.map((signal) => getSourceLabel(signal.source))).size;
  const previewSignals = safeSignals.slice(0, 2);

  const paymentLink = typeof process.env.NEXT_PUBLIC_PAYMENT_LINK === "string" ? process.env.NEXT_PUBLIC_PAYMENT_LINK.trim() : "";
  const canRedirectToPayment = Boolean(paymentLink);

  function handleUnlockClick() {
    if (!canRedirectToPayment) {
      return;
    }

    window.location.href = paymentLink;
  }

  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Market Signal Analysis</h2>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Discussions analyzed</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{safeSignals.length}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sources involved</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{sourcesInvolved}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Evidence Preview</h3>

          {previewSignals.length > 0 ? (
            <div className="space-y-3">
              {previewSignals.map((signal, index) => (
                <article key={`${signal.source}-${signal.url}-${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm leading-relaxed text-slate-800">{clampText(signal.text, 200)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                      {getSourceLabel(signal.source)}
                    </span>
                    <span>Engagement: {signal.engagement}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No discussion evidence available yet.
            </p>
          )}
        </div>

        <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          Full verdict and strategic recommendations available below.
        </p>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="pointer-events-none select-none blur-sm">
            <div className="space-y-4 p-5 sm:p-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Verdict</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{result.analysis.verdict}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reasoning</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{result.analysis.reasoning}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Opportunities</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {result.analysis.opportunities.map((item) => (
                    <li key={`opportunity-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Risks</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {result.analysis.risks.map((item) => (
                    <li key={`risk-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Confidence level</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{result.analysis.confidence}</p>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 p-5 text-center">
            <div className="mx-auto w-full max-w-lg space-y-4">
              <p className="text-sm leading-relaxed text-white sm:text-base">
                Unlock the full validation report to see whether this idea is worth pursuing.
              </p>

              <button
                type="button"
                onClick={handleUnlockClick}
                disabled={!canRedirectToPayment}
                className="mx-auto inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                Unlock Full Report
              </button>

              {!canRedirectToPayment ? (
                <p className="text-xs text-slate-200">Payment link is not configured.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
