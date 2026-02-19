import { z } from "zod";

export const VALIDATION_SOURCES = ["reddit", "hn", "ph", "twitter", "trends", "appstore", "g2"] as const;

export type ValidationSource = (typeof VALIDATION_SOURCES)[number];
export type ValidationVerdict = "BUILD" | "PIVOT" | "PASS";

export type FounderProfileInput = {
  domainExpertise: string[];
  yearsExperience: string;
  keySkills: string[];
  budget: string;
  timeCommitment: string;
};

export type ValidationEngineInput = {
  ideaText: string;
  industry?: string | null;
  targetCustomer?: string | null;
  stage: "pre-idea" | "mvp" | "launched";
  founderProfile?: FounderProfileInput;
};

export type PainQuote = {
  quote: string;
  reason: string;
  url?: string;
};

export type SourceSignal = {
  source: ValidationSource;
  status: "ok" | "unavailable" | "error";
  demandScore: number;
  mentions: number;
  painQuotes: PainQuote[];
  competitors: string[];
  highlights: string[];
  raw: Record<string, unknown>;
  error?: string;
};

export type ValidationEngineResult = {
  signalScore: number;
  founderFitScore: number;
  verdict: ValidationVerdict;
  confidence: number;
  summary: string;
  nextSteps: string[];
  signals: SourceSignal[];
  coverage: number;
};

type SignalEntry = {
  title: string;
  snippet?: string;
  url?: string;
  engagement?: number;
};

const jsonRecordSchema = z.record(z.unknown());

const PAIN_KEYWORDS = [
  "problem",
  "struggle",
  "pain",
  "annoying",
  "hard",
  "difficult",
  "frustrat",
  "expensive",
  "waste",
  "manual",
  "slow",
  "broken",
  "bug",
  "issue",
  "need",
  "looking for"
] as const;

const SOURCE_LABELS: Record<ValidationSource, string> = {
  reddit: "Reddit",
  hn: "Hacker News",
  ph: "Product Hunt",
  twitter: "X/Twitter",
  trends: "Google Trends",
  appstore: "App Store",
  g2: "G2"
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function stdDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 12000): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "ValidateMyIdeaBot/1.0",
        ...(init?.headers ?? {})
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = (await response.json()) as unknown;
    return jsonRecordSchema.parse(json);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeEntryText(entry: SignalEntry) {
  return `${entry.title} ${entry.snippet ?? ""}`.toLowerCase();
}

function extractPainQuotes(entries: SignalEntry[], maxQuotes = 4): PainQuote[] {
  const quotes: PainQuote[] = [];

  for (const entry of entries) {
    if (quotes.length >= maxQuotes) break;

    const combined = `${entry.title}. ${entry.snippet ?? ""}`.trim();
    const lowered = combined.toLowerCase();
    const trigger = PAIN_KEYWORDS.find((keyword) => lowered.includes(keyword));

    if (!trigger) continue;

    quotes.push({
      quote: combined.slice(0, 220),
      reason: `Contains keyword: ${trigger}`,
      url: entry.url
    });
  }

  if (quotes.length > 0) {
    return quotes;
  }

  return entries.slice(0, Math.min(maxQuotes, entries.length)).map((entry) => ({
    quote: `${entry.title}. ${entry.snippet ?? ""}`.trim().slice(0, 220),
    reason: "Representative market conversation",
    url: entry.url
  }));
}

function extractCompetitors(entries: SignalEntry[], max = 5): string[] {
  const unique = new Set<string>();

  for (const entry of entries) {
    const candidate = entry.title.replace(/\s+/g, " ").trim();

    if (!candidate || candidate.length < 3) continue;
    if (candidate.toLowerCase().includes("reddit")) continue;

    unique.add(candidate.slice(0, 80));
    if (unique.size >= max) break;
  }

  return [...unique];
}

function scoreEntries(entries: SignalEntry[]) {
  if (entries.length === 0) {
    return 0;
  }

  const mentionsScore = Math.min(entries.length * 8, 40);
  const engagementAverage = mean(entries.map((entry) => entry.engagement ?? 0));
  const engagementScore = Math.min(30, engagementAverage / 12);

  const painMatches = entries.reduce((acc, entry) => {
    const text = normalizeEntryText(entry);
    const hasPain = PAIN_KEYWORDS.some((keyword) => text.includes(keyword));
    return acc + (hasPain ? 1 : 0);
  }, 0);

  const painScore = Math.min(30, painMatches * 6);

  return clampScore(mentionsScore + engagementScore + painScore);
}

function shapeSourceSignal(source: ValidationSource, entries: SignalEntry[], raw: Record<string, unknown>): SourceSignal {
  const demandScore = scoreEntries(entries);

  return {
    source,
    status: "ok",
    demandScore,
    mentions: entries.length,
    painQuotes: extractPainQuotes(entries),
    competitors: extractCompetitors(entries),
    highlights: entries.slice(0, 3).map((entry) => entry.title).filter(Boolean),
    raw
  };
}

function sourceError(source: ValidationSource, error: unknown): SourceSignal {
  return {
    source,
    status: "error",
    demandScore: 0,
    mentions: 0,
    painQuotes: [],
    competitors: [],
    highlights: [],
    raw: {},
    error: error instanceof Error ? error.message : "Unknown error"
  };
}

function sourceUnavailable(source: ValidationSource, reason: string): SourceSignal {
  return {
    source,
    status: "unavailable",
    demandScore: 0,
    mentions: 0,
    painQuotes: [],
    competitors: [],
    highlights: [],
    raw: {},
    error: reason
  };
}

async function collectReddit(query: string): Promise<SourceSignal> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=12&sort=top&t=year`;
    const json = await fetchJson(url);

    const children = Array.isArray((json.data as Record<string, unknown> | undefined)?.children)
      ? ((json.data as Record<string, unknown>).children as Array<Record<string, unknown>>)
      : [];

    const entries: SignalEntry[] = children.map((item) => {
      const data = (item.data as Record<string, unknown>) ?? {};
      return {
        title: String(data.title ?? ""),
        snippet: String(data.selftext ?? ""),
        url: data.permalink ? `https://reddit.com${String(data.permalink)}` : undefined,
        engagement: Number(data.score ?? 0) + Number(data.num_comments ?? 0)
      };
    });

    return shapeSourceSignal("reddit", entries, json);
  } catch (error) {
    return sourceError("reddit", error);
  }
}

async function collectHn(query: string): Promise<SourceSignal> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=12`;
    const json = await fetchJson(url);

    const hits = Array.isArray(json.hits) ? (json.hits as Array<Record<string, unknown>>) : [];

    const entries: SignalEntry[] = hits.map((item) => ({
      title: String(item.title ?? item.story_title ?? ""),
      snippet: String(item.comment_text ?? ""),
      url: String(item.url ?? item.story_url ?? ""),
      engagement: Number(item.points ?? 0) + Number(item.num_comments ?? 0)
    }));

    return shapeSourceSignal("hn", entries, json);
  } catch (error) {
    return sourceError("hn", error);
  }
}

async function collectProductHunt(query: string): Promise<SourceSignal> {
  const token = process.env.PRODUCT_HUNT_ACCESS_TOKEN;
  const serpApiKey = process.env.SERPAPI_API_KEY;

  if (!token && !serpApiKey) {
    return sourceUnavailable("ph", "PRODUCT_HUNT_ACCESS_TOKEN or SERPAPI_API_KEY not configured");
  }

  try {
    if (token) {
      const response = await fetch("https://api.producthunt.com/v2/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `
            query SearchProducts($query: String!) {
              search(query: $query, first: 10) {
                edges {
                  node {
                    ... on Post {
                      name
                      tagline
                      votesCount
                      commentsCount
                      url
                    }
                  }
                }
              }
            }
          `,
          variables: { query }
        }),
        cache: "no-store"
      });

      if (response.ok) {
        const json = (await response.json()) as Record<string, unknown>;
        const data = (json.data as Record<string, unknown> | undefined) ?? {};
        const search = (data.search as Record<string, unknown> | undefined) ?? {};
        const edges = Array.isArray(search.edges) ? (search.edges as Array<Record<string, unknown>>) : [];

        const entries: SignalEntry[] = edges.map((edge) => {
          const node = (edge.node as Record<string, unknown>) ?? {};
          return {
            title: String(node.name ?? ""),
            snippet: String(node.tagline ?? ""),
            url: String(node.url ?? ""),
            engagement: Number(node.votesCount ?? 0) + Number(node.commentsCount ?? 0)
          };
        });

        if (entries.length > 0) {
          return shapeSourceSignal("ph", entries, json);
        }
      }
    }

    if (serpApiKey) {
      const json = await fetchJson(
        `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
          `site:producthunt.com ${query}`
        )}&api_key=${encodeURIComponent(serpApiKey)}`
      );
      const organic = Array.isArray(json.organic_results) ? (json.organic_results as Array<Record<string, unknown>>) : [];

      const entries: SignalEntry[] = organic.slice(0, 10).map((item) => ({
        title: String(item.title ?? ""),
        snippet: String(item.snippet ?? ""),
        url: String(item.link ?? ""),
        engagement: Number(item.position ?? 0)
      }));

      return shapeSourceSignal("ph", entries, json);
    }

    return sourceUnavailable("ph", "No Product Hunt results found");
  } catch (error) {
    return sourceError("ph", error);
  }
}

async function collectTwitter(query: string): Promise<SourceSignal> {
  const token = process.env.TWITTER_BEARER_TOKEN;

  if (!token) {
    return sourceUnavailable("twitter", "TWITTER_BEARER_TOKEN not configured");
  }

  try {
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(
      `${query} -is:retweet lang:en`
    )}&max_results=15&tweet.fields=public_metrics,created_at`;

    const json = await fetchJson(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const tweets = Array.isArray(json.data) ? (json.data as Array<Record<string, unknown>>) : [];

    const entries: SignalEntry[] = tweets.map((tweet) => {
      const metrics = (tweet.public_metrics as Record<string, unknown> | undefined) ?? {};

      return {
        title: String(tweet.text ?? ""),
        snippet: "",
        url: undefined,
        engagement:
          Number(metrics.like_count ?? 0) +
          Number(metrics.retweet_count ?? 0) +
          Number(metrics.reply_count ?? 0)
      };
    });

    return shapeSourceSignal("twitter", entries, json);
  } catch (error) {
    return sourceError("twitter", error);
  }
}

async function collectTrends(query: string): Promise<SourceSignal> {
  const serpApiKey = process.env.SERPAPI_API_KEY;

  if (!serpApiKey) {
    return sourceUnavailable("trends", "SERPAPI_API_KEY not configured");
  }

  try {
    const json = await fetchJson(
      `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(serpApiKey)}`
    );

    const timeline = Array.isArray((json.interest_over_time as Record<string, unknown> | undefined)?.timeline_data)
      ? (((json.interest_over_time as Record<string, unknown>).timeline_data as Array<Record<string, unknown>>) ?? [])
      : [];

    const entries: SignalEntry[] = timeline.slice(-12).map((point) => {
      const values = Array.isArray(point.values) ? (point.values as Array<Record<string, unknown>>) : [];
      const first = values[0] ?? {};

      return {
        title: `Trend point ${String(point.date ?? "")}`,
        snippet: `Interest value ${String(first.value ?? 0)}`,
        engagement: Number(first.value ?? 0)
      };
    });

    return shapeSourceSignal("trends", entries, json);
  } catch (error) {
    return sourceError("trends", error);
  }
}

async function collectAppStore(query: string): Promise<SourceSignal> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&country=us&limit=12`;
    const json = await fetchJson(url);

    const results = Array.isArray(json.results) ? (json.results as Array<Record<string, unknown>>) : [];

    const entries: SignalEntry[] = results.map((item) => ({
      title: String(item.trackName ?? ""),
      snippet: String(item.description ?? ""),
      url: String(item.trackViewUrl ?? ""),
      engagement: Number(item.averageUserRating ?? 0) * Number(item.userRatingCount ?? 0)
    }));

    return shapeSourceSignal("appstore", entries, json);
  } catch (error) {
    return sourceError("appstore", error);
  }
}

async function collectG2(query: string): Promise<SourceSignal> {
  const serpApiKey = process.env.SERPAPI_API_KEY;

  if (!serpApiKey) {
    return sourceUnavailable("g2", "SERPAPI_API_KEY not configured");
  }

  try {
    const json = await fetchJson(
      `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
        `site:g2.com ${query} alternatives reviews`
      )}&api_key=${encodeURIComponent(serpApiKey)}`
    );

    const organic = Array.isArray(json.organic_results) ? (json.organic_results as Array<Record<string, unknown>>) : [];

    const entries: SignalEntry[] = organic.slice(0, 12).map((item) => ({
      title: String(item.title ?? ""),
      snippet: String(item.snippet ?? ""),
      url: String(item.link ?? ""),
      engagement: Number(item.position ?? 0)
    }));

    return shapeSourceSignal("g2", entries, json);
  } catch (error) {
    return sourceError("g2", error);
  }
}

function calculateFounderFit(input: ValidationEngineInput) {
  if (!input.founderProfile) {
    return 50;
  }

  const profile = input.founderProfile;

  const stageBaseMap: Record<ValidationEngineInput["stage"], number> = {
    "pre-idea": 45,
    mvp: 60,
    launched: 72
  };

  const experienceMap: Record<string, number> = {
    "0-1": 8,
    "2-4": 15,
    "5-8": 22,
    "9+": 28
  };

  const budgetMap: Record<string, number> = {
    "<$500/mo": 8,
    "$500-$2k/mo": 14,
    "$2k-$10k/mo": 20,
    "$10k+/mo": 26
  };

  const timeMap: Record<string, number> = {
    "<5 hrs/week": 8,
    "5-10 hrs/week": 12,
    "10-20 hrs/week": 18,
    "20+ hrs/week": 24
  };

  const stageScore = stageBaseMap[input.stage];
  const experienceScore = experienceMap[profile.yearsExperience] ?? 10;
  const budgetScore = budgetMap[profile.budget] ?? 10;
  const timeScore = timeMap[profile.timeCommitment] ?? 10;

  const domainCountScore = Math.min(14, profile.domainExpertise.length * 4);
  const skillsCountScore = Math.min(14, profile.keySkills.length * 3);

  const industry = (input.industry ?? "").toLowerCase();
  const hasIndustryAlignment = profile.domainExpertise.some((item) => item.toLowerCase().includes(industry) || industry.includes(item.toLowerCase()));
  const alignmentBonus = industry && hasIndustryAlignment ? 8 : 0;

  return clampScore(stageScore + experienceScore + budgetScore + timeScore + domainCountScore + skillsCountScore + alignmentBonus - 40);
}

function calculateVerdict(signalScore: number, founderFitScore: number): ValidationVerdict {
  if (signalScore >= 65 && founderFitScore >= 58) return "BUILD";
  if (signalScore >= 45 || founderFitScore >= 50) return "PIVOT";
  return "PASS";
}

function sourceDisplayName(source: ValidationSource) {
  return SOURCE_LABELS[source];
}

function createSummary({
  signalScore,
  founderFitScore,
  verdict,
  coverage,
  strongestSource,
  weakestSource
}: {
  signalScore: number;
  founderFitScore: number;
  verdict: ValidationVerdict;
  coverage: number;
  strongestSource?: SourceSignal;
  weakestSource?: SourceSignal;
}) {
  const demandBand = signalScore >= 70 ? "strong" : signalScore >= 50 ? "moderate" : "weak";

  return `${verdict} verdict: market demand looks ${demandBand} (signal score ${signalScore}/100) with founder readiness at ${founderFitScore}/100. Source coverage was ${coverage}% across 7 channels${strongestSource ? `, led by ${sourceDisplayName(strongestSource.source)}` : ""}${weakestSource ? ` and weakest on ${sourceDisplayName(weakestSource.source)}` : ""}.`;
}

function createNextSteps(verdict: ValidationVerdict, weakest: SourceSignal[]): string[] {
  const weakSources = weakest.map((item) => sourceDisplayName(item.source));

  if (verdict === "BUILD") {
    return [
      "Run 10 targeted customer interviews to validate willingness to pay.",
      "Ship a focused landing page experiment and track conversion to waitlist.",
      weakSources.length > 0
        ? `Strengthen weak channels first: ${weakSources.join(", ")} before scaling acquisition.`
        : "Prepare a 30-day launch sprint with weekly validation checkpoints."
    ];
  }

  if (verdict === "PIVOT") {
    return [
      "Narrow your ICP and rewrite the core value proposition around one urgent pain.",
      weakSources.length > 0
        ? `Re-test demand on underperforming channels: ${weakSources.join(", ")}.`
        : "Re-test messaging with 3 distinct positioning angles.",
      "Run a fast smoke test with pricing to validate buyer intent before building further."
    ];
  }

  return [
    "Pause full product build and explore adjacent pain points with stronger urgency.",
    weakSources.length > 0
      ? `Review why demand was weak on ${weakSources.join(", ")} and identify alternative customer segments.`
      : "Collect at least 15 discovery interviews before selecting the next direction.",
    "Define a tighter problem statement and rerun validation with a more specific niche."
  ];
}

export async function runValidationEngine(input: ValidationEngineInput): Promise<ValidationEngineResult> {
  const query = [input.ideaText, input.industry, input.targetCustomer].filter(Boolean).join(" ").trim();

  const [reddit, hn, ph, twitter, trends, appstore, g2] = await Promise.all([
    collectReddit(query),
    collectHn(query),
    collectProductHunt(query),
    collectTwitter(query),
    collectTrends(query),
    collectAppStore(query),
    collectG2(query)
  ]);

  const signals = [reddit, hn, ph, twitter, trends, appstore, g2];
  const successful = signals.filter((signal) => signal.status === "ok");

  const coverage = clampScore((successful.length / VALIDATION_SOURCES.length) * 100);

  const signalScores = successful.map((signal) => signal.demandScore);
  const signalScore = signalScores.length > 0 ? clampScore(mean(signalScores)) : 0;

  const founderFitScore = calculateFounderFit(input);
  const verdict = calculateVerdict(signalScore, founderFitScore);

  const consistencyPenalty = stdDeviation(signalScores);
  const confidence = clampScore(coverage * 0.6 + Math.max(0, 100 - consistencyPenalty * 3.2) * 0.4);

  const sortedByScore = [...successful].sort((a, b) => b.demandScore - a.demandScore);
  const strongest = sortedByScore[0];
  const weakest = sortedByScore.slice(-2).reverse();

  const summary = createSummary({
    signalScore,
    founderFitScore,
    verdict,
    coverage,
    strongestSource: strongest,
    weakestSource: weakest[0]
  });

  const nextSteps = createNextSteps(verdict, weakest);

  return {
    signalScore,
    founderFitScore,
    verdict,
    confidence,
    summary,
    nextSteps,
    signals,
    coverage
  };
}
