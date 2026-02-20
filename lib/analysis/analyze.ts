export type Signal = {
  text: string;
  source: string;
  engagement: number;
  url: string;
};

export type AnalysisResult = {
  verdict: "BUILD" | "PIVOT" | "PASS";
  reasoning: string;
  opportunities: string[];
  risks: string[];
  confidence: "Low" | "Medium" | "High";
};

const FALLBACK_RESULT: AnalysisResult = {
  verdict: "PIVOT",
  reasoning: "Insufficient data for confident assessment.",
  opportunities: [],
  risks: ["Low signal availability"],
  confidence: "Low"
};

const DEFAULT_AI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_AI_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_SIGNALS = 10;
const MAX_SIGNAL_TEXT_CHARS = 360;
const MAX_EVIDENCE_CHARS = 6_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
}

function cleanSignal(signal: Signal): Signal {
  return {
    text: normalizeWhitespace(signal.text),
    source: normalizeWhitespace(signal.source || "unknown") || "unknown",
    engagement: Number.isFinite(signal.engagement) ? Math.max(0, Math.round(signal.engagement)) : 0,
    url: normalizeWhitespace(signal.url || "")
  };
}

function buildEvidenceSection(idea: string, signals: Signal[]): string {
  const sortedSignals = [...signals]
    .map(cleanSignal)
    .filter((signal) => signal.text.length > 0)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, MAX_SIGNALS);

  if (sortedSignals.length === 0) {
    return `Idea:\n${normalizeWhitespace(idea)}\n\nSignals:\n- No usable discussion signals provided.`;
  }

  const lines: string[] = ["Idea:", normalizeWhitespace(idea), "", "Signals:"];

  for (let index = 0; index < sortedSignals.length; index += 1) {
    const signal = sortedSignals[index];
    const text = truncate(signal.text, MAX_SIGNAL_TEXT_CHARS);
    const url = signal.url || "N/A";

    lines.push(`${index + 1}. Source: ${signal.source} | Engagement: ${signal.engagement}`);
    lines.push(`   URL: ${url}`);
    lines.push(`   Text: ${text}`);
  }

  const full = lines.join("\n");
  return truncate(full, MAX_EVIDENCE_CHARS);
}

function buildSystemPrompt(): string {
  return [
    "A skeptical startup analyst evaluating evidence, not generating marketing copy.",
    "Use only the provided signals.",
    "No speculation beyond evidence.",
    "Prefer caution over optimism.",
    "Be specific and actionable.",
    "Identify recurring patterns across signals.",
    "",
    "Decision logic:",
    "- BUILD: Strong recurring pain, clear unmet need, users actively seeking solutions.",
    "- PIVOT: Some demand but unclear positioning, saturated competition, or mixed sentiment.",
    "- PASS: Weak/nonexistent pain, indifference/hostility, or clearly oversolved problem.",
    "",
    "Output rules:",
    "- Return ONLY valid JSON.",
    "- No markdown or extra text.",
    "- JSON must match exactly:",
    '{"verdict":"BUILD|PIVOT|PASS","reasoning":"string","opportunities":["string"],"risks":["string"],"confidence":"Low|Medium|High"}'
  ].join("\n");
}

function extractContentText(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const firstChoice = choices[0];

    if (isRecord(firstChoice)) {
      const message = firstChoice.message;
      if (isRecord(message)) {
        if (typeof message.content === "string") {
          return message.content;
        }

        if (Array.isArray(message.content)) {
          const textParts = message.content
            .map((item) => {
              if (isRecord(item) && typeof item.text === "string") {
                return item.text;
              }

              return "";
            })
            .filter(Boolean);

          if (textParts.length > 0) {
            return textParts.join("\n");
          }
        }
      }

      if (typeof firstChoice.text === "string") {
        return firstChoice.text;
      }
    }
  }

  return null;
}

function extractJsonCandidate(rawText: string): string {
  const trimmed = rawText.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeWhitespace(item))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

function parseAnalysisObject(value: unknown): AnalysisResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const verdict = value.verdict;
  const confidence = value.confidence;
  const reasoning = typeof value.reasoning === "string" ? normalizeWhitespace(value.reasoning) : "";

  if (verdict !== "BUILD" && verdict !== "PIVOT" && verdict !== "PASS") {
    return null;
  }

  if (confidence !== "Low" && confidence !== "Medium" && confidence !== "High") {
    return null;
  }

  if (!reasoning) {
    return null;
  }

  const opportunities = toStringArray(value.opportunities);
  const risks = toStringArray(value.risks);

  return {
    verdict,
    confidence,
    reasoning,
    opportunities,
    risks
  };
}

function parseAnalysisFromResponse(payload: unknown): AnalysisResult | null {
  const direct = parseAnalysisObject(payload);
  if (direct) {
    return direct;
  }

  const text = extractContentText(payload);
  if (!text) {
    return null;
  }

  const candidate = extractJsonCandidate(text);

  try {
    const parsed = JSON.parse(candidate) as unknown;
    return parseAnalysisObject(parsed);
  } catch {
    return null;
  }
}

async function requestAnalysisFromModel(systemPrompt: string, userPrompt: string): Promise<AnalysisResult | null> {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const endpoint = process.env.AI_API_URL || DEFAULT_AI_API_URL;
  const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    return parseAnalysisFromResponse(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeIdea(idea: string, signals: Signal[]): Promise<AnalysisResult> {
  const normalizedIdea = normalizeWhitespace(idea);

  if (!normalizedIdea || signals.length === 0) {
    return FALLBACK_RESULT;
  }

  const evidence = buildEvidenceSection(normalizedIdea, signals);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = [
    "Evaluate this startup idea using only the evidence below.",
    "",
    evidence,
    "",
    "Return only JSON matching the required schema."
  ].join("\n");

  const analysis = await requestAnalysisFromModel(systemPrompt, userPrompt);
  return analysis ?? FALLBACK_RESULT;
}
