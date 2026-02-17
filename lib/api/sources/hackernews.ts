import { buildCacheKey, getOrSetCache } from "@/lib/api/cache/redis";
import { enforceRateLimit } from "@/lib/api/ratelimit";
import {
  type Comment,
  type HackerNewsSignalResult,
  type Launch,
  type Story,
  SourceApiError,
  isRecord,
  normalizeSourceError,
  withRetries
} from "@/lib/api/types/signals";

const HN_ENDPOINT = "https://hn.algolia.com/api/v1/search";
const HN_CACHE_TTL_SECONDS = 15 * 60;
const MAX_STORIES = 25;
const MAX_COMMENTS = 35;

const LAUNCH_PATTERNS = [/\bshow\s+hn\b/i, /\blaunch(?:ed|ing)?\b/i, /\bmvp\b/i, /\bbeta\b/i, /\bnew\s+product\b/i];

const TECH_SIGNAL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bscale|scaling|throughput|latency\b/i, label: "Scalability concerns discussed" },
  { pattern: /\bsecurity|auth|privacy|gdpr|soc\s?2\b/i, label: "Security/compliance constraints surfaced" },
  { pattern: /\bapi|integration|webhook|sdk\b/i, label: "Integration complexity mentioned" },
  { pattern: /\bcost|pricing|burn|margin|cac\b/i, label: "Unit economics and cost pressure mentioned" },
  { pattern: /\breliability|downtime|incident|bug|outage\b/i, label: "Reliability risks reported" },
  { pattern: /\bperformance|slow|optimiz|memory\b/i, label: "Performance bottlenecks referenced" }
];

const POSITIVE_SENTIMENT_WORDS = [
  "love",
  "great",
  "excellent",
  "useful",
  "helpful",
  "fast",
  "stable",
  "reliable",
  "impressive",
  "solid"
] as const;

const NEGATIVE_SENTIMENT_WORDS = [
  "hate",
  "bad",
  "poor",
  "slow",
  "bug",
  "broken",
  "expensive",
  "unreliable",
  "frustrating",
  "difficult"
] as const;

interface HnHit {
  objectID: string;
  title: string;
  url: string;
  points: number;
  numComments: number;
  author: string;
  createdAt?: string;
  storyText: string;
  commentText: string;
  storyTitle: string;
  storyUrl: string;
  storyId: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string): string {
  return normalizeWhitespace(value.replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'"));
}

function tokenize(input: string): string[] {
  return normalizeWhitespace(input)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2);
}

function countTokenMatches(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  let matchCount = 0;

  for (const token of tokens) {
    if (lower.includes(token)) {
      matchCount += 1;
    }
  }

  return matchCount;
}

function estimateSentimentScore(text: string): number {
  if (!text) {
    return 0;
  }

  const lower = text.toLowerCase();

  const positive = POSITIVE_SENTIMENT_WORDS.reduce((count, word) => (lower.includes(word) ? count + 1 : count), 0);
  const negative = NEGATIVE_SENTIMENT_WORDS.reduce((count, word) => (lower.includes(word) ? count + 1 : count), 0);

  if (positive === 0 && negative === 0) {
    return 0;
  }

  const score = (positive - negative) / (positive + negative);
  return Math.max(-1, Math.min(1, Number(score.toFixed(4))));
}

function computeRelevance(query: string, title: string, body: string, points: number): number {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return 0;
  }

  const titleCoverage = countTokenMatches(title, tokens) / tokens.length;
  const bodyCoverage = countTokenMatches(body, tokens) / tokens.length;
  const pointsBoost = Math.min(points, 100) / 100;

  const rawScore = titleCoverage * 0.5 + bodyCoverage * 0.3 + pointsBoost * 0.2;
  return Math.max(0, Math.min(1, Number(rawScore.toFixed(4))));
}

function extractTechnicalSignals(text: string): string[] {
  const signals: string[] = [];

  for (const entry of TECH_SIGNAL_PATTERNS) {
    if (entry.pattern.test(text)) {
      signals.push(entry.label);
    }
  }

  return signals;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? normalizeWhitespace(value) : fallback;
}

function parseHits(payload: unknown): HnHit[] {
  if (!isRecord(payload) || !Array.isArray(payload.hits)) {
    return [];
  }

  const hits: HnHit[] = [];

  for (const item of payload.hits) {
    if (!isRecord(item)) {
      continue;
    }

    const objectID = parseString(item.objectID);
    if (!objectID) {
      continue;
    }

    const title = stripHtml(parseString(item.title));
    const url = parseString(item.url);
    const points = parseNumber(item.points, 0);
    const numComments = parseNumber(item.num_comments, 0);
    const author = parseString(item.author, "unknown");
    const createdAt = parseString(item.created_at) || undefined;
    const storyText = stripHtml(parseString(item.story_text));
    const commentText = stripHtml(parseString(item.comment_text));
    const storyTitle = stripHtml(parseString(item.story_title));
    const storyUrl = parseString(item.story_url);
    const storyId = parseString(item.story_id) || objectID;

    hits.push({
      objectID,
      title,
      url,
      points,
      numComments,
      author,
      createdAt,
      storyText,
      commentText,
      storyTitle,
      storyUrl,
      storyId
    });
  }

  return hits;
}

async function fetchAlgolia(query: string, tags: "story" | "comment", hitsPerPage: number): Promise<HnHit[]> {
  const endpoint = new URL(HN_ENDPOINT);
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("tags", tags);
  endpoint.searchParams.set("hitsPerPage", String(hitsPerPage));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new SourceApiError("hackernews", "UPSTREAM_ERROR", `HN Algolia returned status ${response.status}`, {
        status: response.status,
        retryable: response.status === 429 || response.status >= 500,
        details: { query, tags }
      });
    }

    const payload = (await response.json()) as unknown;
    return parseHits(payload);
  } catch (error) {
    if (error instanceof SourceApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new SourceApiError("hackernews", "TIMEOUT", "HN Algolia request timed out", {
        retryable: true,
        cause: error,
        details: { query, tags }
      });
    }

    throw new SourceApiError("hackernews", "NETWORK_ERROR", "Failed to call HN Algolia", {
      retryable: true,
      cause: error,
      details: { query, tags }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildStory(hit: HnHit, query: string): Story {
  const title = hit.title || hit.storyTitle || "Untitled HN story";
  const excerpt = hit.storyText || "";
  const url = hit.url || hit.storyUrl || `https://news.ycombinator.com/item?id=${hit.objectID}`;
  const relevanceScore = computeRelevance(query, title, excerpt, hit.points);
  const technicalSignals = extractTechnicalSignals(`${title} ${excerpt}`);

  return {
    id: hit.objectID,
    title,
    url,
    points: hit.points,
    commentsCount: hit.numComments,
    author: hit.author,
    excerpt,
    relevanceScore,
    technicalSignals,
    sentimentScore: estimateSentimentScore(`${title} ${excerpt}`),
    createdAt: hit.createdAt
  };
}

function buildComment(hit: HnHit, query: string): Comment | null {
  const text = hit.commentText;
  if (!text) {
    return null;
  }

  const storyTitle = hit.storyTitle || "Unknown discussion";
  const storyUrl = hit.storyUrl || `https://news.ycombinator.com/item?id=${hit.storyId}`;
  const relevanceScore = computeRelevance(query, storyTitle, text, hit.points);
  const technicalSignals = extractTechnicalSignals(`${storyTitle} ${text}`);

  return {
    id: hit.objectID,
    storyId: hit.storyId,
    storyTitle,
    storyUrl,
    text,
    author: hit.author,
    points: hit.points,
    relevanceScore,
    technicalSignals,
    sentimentScore: estimateSentimentScore(text),
    createdAt: hit.createdAt
  };
}

function buildLaunches(stories: Story[]): Launch[] {
  return stories
    .filter((story) => LAUNCH_PATTERNS.some((pattern) => pattern.test(story.title)))
    .map((story) => ({
      id: story.id,
      title: story.title,
      url: story.url,
      points: story.points,
      commentsCount: story.commentsCount,
      relevanceScore: story.relevanceScore,
      technicalSignals: story.technicalSignals,
      createdAt: story.createdAt
    }))
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      return right.relevanceScore - left.relevanceScore;
    });
}

function sortStories(stories: Story[]): Story[] {
  const maxPoints = Math.max(...stories.map((story) => story.points), 1);

  return [...stories].sort((left, right) => {
    const leftScore = left.relevanceScore * 0.7 + (left.points / maxPoints) * 0.3;
    const rightScore = right.relevanceScore * 0.7 + (right.points / maxPoints) * 0.3;

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return right.points - left.points;
  });
}

function sortComments(comments: Comment[]): Comment[] {
  const maxPoints = Math.max(...comments.map((comment) => comment.points), 1);

  return [...comments].sort((left, right) => {
    const leftScore = left.relevanceScore * 0.75 + (left.points / maxPoints) * 0.25;
    const rightScore = right.relevanceScore * 0.75 + (right.points / maxPoints) * 0.25;

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return right.points - left.points;
  });
}

/**
 * Searches stories and comments on Hacker News and extracts launch and technical viability signals.
 */
export async function searchHackerNews(query: string): Promise<HackerNewsSignalResult> {
  const normalizedQuery = normalizeWhitespace(query);

  if (!normalizedQuery) {
    throw new SourceApiError("hackernews", "VALIDATION_ERROR", "searchHackerNews requires a non-empty query");
  }

  const cacheKey = buildCacheKey("hackernews", {
    query: normalizedQuery.toLowerCase()
  });

  return getOrSetCache(cacheKey, HN_CACHE_TTL_SECONDS, async () => {
    enforceRateLimit("global", {
      namespace: "hackernews-search",
      maxRequests: 90,
      windowMs: 60_000
    });

    try {
      const [storyHits, commentHits] = await Promise.all([
        withRetries(
          async () => fetchAlgolia(normalizedQuery, "story", MAX_STORIES),
          {
            source: "hackernews",
            operation: "Hacker News story search",
            retries: 3,
            baseDelayMs: 200,
            maxDelayMs: 1_200
          }
        ),
        withRetries(
          async () => fetchAlgolia(normalizedQuery, "comment", MAX_COMMENTS),
          {
            source: "hackernews",
            operation: "Hacker News comment search",
            retries: 3,
            baseDelayMs: 200,
            maxDelayMs: 1_200
          }
        )
      ]);

      const stories = sortStories(storyHits.map((hit) => buildStory(hit, normalizedQuery))).slice(0, MAX_STORIES);

      const comments = sortComments(
        commentHits
          .map((hit) => buildComment(hit, normalizedQuery))
          .filter((comment): comment is Comment => comment !== null)
      ).slice(0, MAX_COMMENTS);

      const launches = buildLaunches(stories);

      return {
        stories,
        comments,
        launches
      };
    } catch (error) {
      throw normalizeSourceError("hackernews", error, "Failed to fetch Hacker News signals");
    }
  });
}
