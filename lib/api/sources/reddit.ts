import { buildCacheKey, getOrSetCache } from "@/lib/api/cache/redis";
import { enforceRateLimit } from "@/lib/api/ratelimit";
import {
  type Post,
  type RedditSignalResult,
  SourceApiError,
  isRecord,
  normalizeSourceError,
  withRetries
} from "@/lib/api/types/signals";

const SERPAPI_ENDPOINT = "https://serpapi.com/search";
const REDDIT_CACHE_TTL_SECONDS = 60 * 60;
const REDDIT_MAX_RESULTS = 20;
const REDDIT_MIN_RELEVANCE = 0.2;

const PAIN_KEYWORDS = [
  "pain",
  "problem",
  "issue",
  "frustrat",
  "annoy",
  "difficult",
  "expensive",
  "manual",
  "time-consuming",
  "broken",
  "hate",
  "struggle"
] as const;

const COMPETITOR_STOPWORDS = new Set([
  "Reddit",
  "Startup",
  "Founder",
  "Founders",
  "SaaS",
  "AI",
  "ML",
  "The",
  "And"
]);

interface SerpApiOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSubreddit(value: string): string {
  return value.replace(/^r\//i, "").replace(/[^a-zA-Z0-9_]/g, "").trim();
}

function extractSubredditFromUrl(url: string): string {
  const match = url.match(/reddit\.com\/r\/([^/]+)/i);
  return match?.[1] ?? "unknown";
}

function extractUpvotes(text: string): number {
  const normalized = text.replace(/,/g, "");
  const match = normalized.match(/(\d{1,7})\s*(?:upvotes?|points?|score)/i);
  if (!match) {
    return 0;
  }

  const rawNumber = Number(match[1]);
  return Number.isFinite(rawNumber) ? rawNumber : 0;
}

function tokenize(input: string): string[] {
  return normalizeWhitespace(input)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2);
}

function countTokenMatches(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  let matches = 0;

  for (const token of tokens) {
    if (lower.includes(token)) {
      matches += 1;
    }
  }

  return matches;
}

function includesPainKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return PAIN_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function computeRelevanceScore(query: string, title: string, snippet: string, position: number): number {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return 0;
  }

  const titleMatches = countTokenMatches(title, tokens);
  const snippetMatches = countTokenMatches(snippet, tokens);
  const titleCoverage = titleMatches / tokens.length;
  const snippetCoverage = snippetMatches / tokens.length;

  const positionBoost = Math.max(0, 0.2 - Math.max(0, position - 1) * 0.015);
  const painBoost = includesPainKeyword(`${title} ${snippet}`) ? 0.12 : 0;

  const raw = titleCoverage * 0.55 + snippetCoverage * 0.25 + positionBoost + painBoost;
  return Math.max(0, Math.min(1, Number(raw.toFixed(4))));
}

function extractQuote(snippet: string, title: string): string {
  const candidateText = normalizeWhitespace(snippet || title);

  if (!candidateText) {
    return "No quote available.";
  }

  const sentences = candidateText.split(/(?<=[.!?])\s+/g).map((segment) => segment.trim());
  const prioritized = sentences.find((sentence) => includesPainKeyword(sentence));
  const quote = prioritized ?? sentences[0] ?? candidateText;

  return quote.length <= 260 ? quote : `${quote.slice(0, 257)}...`;
}

function extractCompetitorMentions(text: string): string[] {
  const competitors = new Set<string>();

  const versusPattern = /\b([A-Z][a-zA-Z0-9+.-]{1,30})\s+vs\.?\s+([A-Z][a-zA-Z0-9+.-]{1,30})\b/g;
  const altPattern = /\b(?:alternative(?:s)?\s+to|switch(?:ed|ing)?\s+from|competitor(?:s)?\s+to|using)\s+([A-Z][a-zA-Z0-9+.-]{1,30})\b/gi;

  for (const match of text.matchAll(versusPattern)) {
    const left = match[1];
    const right = match[2];

    if (left && !COMPETITOR_STOPWORDS.has(left)) {
      competitors.add(left);
    }

    if (right && !COMPETITOR_STOPWORDS.has(right)) {
      competitors.add(right);
    }
  }

  for (const match of text.matchAll(altPattern)) {
    const name = match[1];
    if (name && !COMPETITOR_STOPWORDS.has(name)) {
      competitors.add(name);
    }
  }

  return [...competitors];
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(value);
  }

  return deduped;
}

function parseSerpOrganicResults(payload: unknown): SerpApiOrganicResult[] {
  if (!isRecord(payload) || !Array.isArray(payload.organic_results)) {
    return [];
  }

  const results: SerpApiOrganicResult[] = [];

  for (const item of payload.organic_results) {
    if (!isRecord(item)) {
      continue;
    }

    const title = typeof item.title === "string" ? normalizeWhitespace(item.title) : "";
    const link = typeof item.link === "string" ? normalizeWhitespace(item.link) : "";
    const snippet = typeof item.snippet === "string" ? normalizeWhitespace(item.snippet) : "";
    const position = typeof item.position === "number" ? item.position : REDDIT_MAX_RESULTS;

    if (!title || !link) {
      continue;
    }

    results.push({
      title,
      link,
      snippet,
      position
    });
  }

  return results;
}

function buildSerpQuery(query: string, subreddits: string[]): string {
  const sanitizedSubreddits = subreddits.map(normalizeSubreddit).filter((value) => value.length > 0);

  const subredditFilter =
    sanitizedSubreddits.length > 0
      ? `(${sanitizedSubreddits.map((subreddit) => `site:reddit.com/r/${subreddit}`).join(" OR ")})`
      : "site:reddit.com";

  const focusTerms = "(problem OR pain OR frustrating OR expensive OR alternative OR competitor)";
  return `${normalizeWhitespace(query)} ${focusTerms} ${subredditFilter}`;
}

async function callSerpApi(searchQuery: string, apiKey: string): Promise<SerpApiOrganicResult[]> {
  const url = new URL(SERPAPI_ENDPOINT);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(REDDIT_MAX_RESULTS));
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new SourceApiError("reddit", "UPSTREAM_ERROR", `SerpAPI returned status ${response.status}`, {
        status: response.status,
        retryable: response.status === 429 || response.status >= 500,
        details: { searchQuery }
      });
    }

    const payload = (await response.json()) as unknown;

    if (isRecord(payload) && typeof payload.error === "string" && payload.error.length > 0) {
      throw new SourceApiError("reddit", "UPSTREAM_ERROR", payload.error, {
        retryable: false,
        details: { searchQuery }
      });
    }

    return parseSerpOrganicResults(payload);
  } catch (error) {
    if (error instanceof SourceApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new SourceApiError("reddit", "TIMEOUT", "SerpAPI request timed out", {
        retryable: true,
        cause: error,
        details: { searchQuery }
      });
    }

    throw new SourceApiError("reddit", "NETWORK_ERROR", "Failed to reach SerpAPI", {
      retryable: true,
      cause: error,
      details: { searchQuery }
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Searches Reddit discussions through SerpAPI and extracts pain points and competitor mentions.
 */
export async function searchReddit(query: string, subreddits: string[] = []): Promise<RedditSignalResult> {
  const normalizedQuery = normalizeWhitespace(query);

  if (!normalizedQuery) {
    throw new SourceApiError("reddit", "VALIDATION_ERROR", "searchReddit requires a non-empty query");
  }

  const apiKey = process.env.SERPAPI_KEY ?? process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new SourceApiError("reddit", "CONFIG_ERROR", "Missing SERPAPI_KEY environment variable", {
      details: {
        acceptedEnv: ["SERPAPI_KEY", "SERPAPI_API_KEY"]
      }
    });
  }

  const normalizedSubreddits = subreddits.map(normalizeSubreddit).filter((value) => value.length > 0);

  const cacheKey = buildCacheKey("reddit", {
    query: normalizedQuery.toLowerCase(),
    subreddits: normalizedSubreddits.join(",")
  });

  return getOrSetCache(cacheKey, REDDIT_CACHE_TTL_SECONDS, async () => {
    enforceRateLimit("global", {
      namespace: "reddit-search",
      maxRequests: 45,
      windowMs: 60_000
    });

    try {
      const searchQuery = buildSerpQuery(normalizedQuery, normalizedSubreddits);

      const organicResults = await withRetries(
        async () => {
          return callSerpApi(searchQuery, apiKey);
        },
        {
          source: "reddit",
          operation: "Reddit search",
          retries: 3,
          baseDelayMs: 350,
          maxDelayMs: 2_000
        }
      );

      const posts: Post[] = organicResults
        .map((result, index) => {
          const relevanceScore = computeRelevanceScore(normalizedQuery, result.title, result.snippet, result.position);

          return {
            id: `reddit-${index + 1}-${result.position}`,
            title: result.title,
            url: result.link,
            subreddit: extractSubredditFromUrl(result.link),
            quote: extractQuote(result.snippet, result.title),
            upvotes: extractUpvotes(result.snippet),
            relevanceScore,
            createdAt: undefined
          };
        })
        .filter((post) => post.relevanceScore >= REDDIT_MIN_RELEVANCE)
        .sort((left, right) => {
          if (right.relevanceScore !== left.relevanceScore) {
            return right.relevanceScore - left.relevanceScore;
          }

          return right.upvotes - left.upvotes;
        });

      const painPoints = dedupeStrings(
        posts
          .map((post) => post.quote)
          .filter((quote) => includesPainKeyword(quote))
          .slice(0, 20)
      );

      const competitors = dedupeStrings(
        posts
          .flatMap((post) => extractCompetitorMentions(`${post.title} ${post.quote}`))
          .filter((name) => name.length > 1)
          .slice(0, 20)
      );

      return {
        posts,
        painPoints,
        competitors
      };
    } catch (error) {
      throw normalizeSourceError("reddit", error, "Failed to fetch Reddit signals");
    }
  });
}
