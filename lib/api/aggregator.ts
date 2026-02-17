import { enforceRateLimit } from "@/lib/api/ratelimit";
import { searchHackerNews } from "@/lib/api/sources/hackernews";
import { searchProductHunt } from "@/lib/api/sources/producthunt";
import { searchReddit } from "@/lib/api/sources/reddit";
import {
  type CompetitorSignal,
  type HackerNewsSignalResult,
  type PainQuote,
  type ProductHuntSignalResult,
  type RedditSignalResult,
  type Sentiment,
  type SignalFusionOutput,
  type SignalSource,
  SourceApiError,
  normalizeSourceError
} from "@/lib/api/types/signals";

interface SourceOutcome<T> {
  source: SignalSource;
  data: T | null;
  error: SourceApiError | null;
}

const PAIN_WORDS = [
  "problem",
  "pain",
  "frustrat",
  "difficult",
  "slow",
  "expensive",
  "manual",
  "annoy",
  "hate",
  "issue"
] as const;

const POSITIVE_WORDS = ["great", "love", "good", "useful", "helpful", "amazing", "solid", "easy", "fast"] as const;
const NEGATIVE_WORDS = ["bad", "poor", "hate", "slow", "expensive", "broken", "bug", "unreliable", "difficult"] as const;

const INDUSTRY_SUBREDDITS: Record<string, string[]> = {
  ai: ["MachineLearning", "artificial", "startups", "Entrepreneur"],
  saas: ["SaaS", "startups", "Entrepreneur", "smallbusiness"],
  fintech: ["fintech", "startups", "smallbusiness", "entrepreneur"],
  healthcare: ["healthcare", "medicine", "healthIT", "startups"],
  edtech: ["edtech", "teachers", "startups", "Entrepreneur"],
  ecommerce: ["ecommerce", "shopify", "startups", "Entrepreneur"],
  devtools: ["programming", "devops", "startups", "webdev"],
  marketing: ["marketing", "entrepreneur", "startups", "smallbusiness"]
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dedupeBy<T>(items: T[], keySelector: (item: T) => string): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = keySelector(item).toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function inferSubreddits(industry: string): string[] {
  const normalized = industry.toLowerCase().replace(/[^a-z]/g, "");

  for (const [key, subreddits] of Object.entries(INDUSTRY_SUBREDDITS)) {
    if (normalized.includes(key)) {
      return subreddits;
    }
  }

  return ["startups", "Entrepreneur", "smallbusiness"];
}

function estimateTextSentiment(texts: string[]): number {
  let total = 0;
  let scored = 0;

  for (const text of texts) {
    const lower = text.toLowerCase();
    const positive = POSITIVE_WORDS.reduce((count, word) => (lower.includes(word) ? count + 1 : count), 0);
    const negative = NEGATIVE_WORDS.reduce((count, word) => (lower.includes(word) ? count + 1 : count), 0);

    if (positive === 0 && negative === 0) {
      continue;
    }

    scored += 1;
    total += (positive - negative) / (positive + negative);
  }

  if (scored === 0) {
    return 0;
  }

  return Number((total / scored).toFixed(4));
}

function toSentimentLabel(score: number): Sentiment {
  if (score > 0.15) {
    return "positive";
  }

  if (score < -0.15) {
    return "negative";
  }

  return "neutral";
}

function buildPainQuotes(
  reddit: RedditSignalResult | null,
  hackerNews: HackerNewsSignalResult | null,
  productHunt: ProductHuntSignalResult | null
): PainQuote[] {
  const redditQuotes: PainQuote[] =
    reddit?.posts
      .filter((post) => PAIN_WORDS.some((word) => post.quote.toLowerCase().includes(word)))
      .slice(0, 12)
      .map((post) => ({
        text: post.quote,
        source: `reddit/r/${post.subreddit}`,
        engagement: post.upvotes,
        url: post.url
      })) ?? [];

  const hackerNewsQuotes: PainQuote[] =
    hackerNews?.comments
      .filter((comment) => PAIN_WORDS.some((word) => comment.text.toLowerCase().includes(word)))
      .slice(0, 10)
      .map((comment) => ({
        text: comment.text.length <= 260 ? comment.text : `${comment.text.slice(0, 257)}...`,
        source: "hackernews",
        engagement: comment.points,
        url: comment.storyUrl
      })) ?? [];

  const productHuntQuotes: PainQuote[] =
    productHunt?.reviews
      .filter((review) => review.sentiment === "negative")
      .slice(0, 8)
      .map((review) => ({
        text: review.text.length <= 260 ? review.text : `${review.text.slice(0, 257)}...`,
        source: "producthunt",
        engagement: review.engagement,
        url: review.url
      })) ?? [];

  const merged = [...redditQuotes, ...hackerNewsQuotes, ...productHuntQuotes].sort(
    (left, right) => right.engagement - left.engagement
  );

  return dedupeBy(merged, (quote) => `${quote.source}|${quote.text}`).slice(0, 20);
}

function buildCompetitors(
  reddit: RedditSignalResult | null,
  hackerNews: HackerNewsSignalResult | null,
  productHunt: ProductHuntSignalResult | null
): CompetitorSignal[] {
  const fromReddit: CompetitorSignal[] =
    reddit?.competitors.map((name) => ({
      name,
      description: "Mentioned in Reddit pain-point discussions.",
      url: `https://www.google.com/search?q=${encodeURIComponent(name)}`
    })) ?? [];

  const fromHackerNews: CompetitorSignal[] =
    hackerNews?.launches.map((launch) => ({
      name: launch.title.replace(/^Show\s+HN:\s*/i, ""),
      description: "Potential adjacent launch discussed on Hacker News.",
      url: launch.url
    })) ?? [];

  const fromProductHunt: CompetitorSignal[] =
    productHunt?.products.map((product) => ({
      name: product.name,
      description: product.description,
      pricing: product.pricing,
      url: product.url
    })) ?? [];

  const merged = [...fromProductHunt, ...fromReddit, ...fromHackerNews];
  return dedupeBy(merged, (competitor) => competitor.name).slice(0, 25);
}

function computeSignalScore(
  totalMentions: number,
  sentimentScore: number,
  trending: boolean,
  totalEngagement: number,
  competitorCount: number,
  riskCount: number
): number {
  const mentionComponent = clamp(totalMentions * 1.35, 0, 35);
  const engagementComponent = clamp(Math.log10(totalEngagement + 1) * 12, 0, 25);
  const sentimentComponent = clamp((sentimentScore + 1) * 10, 0, 20);
  const trendComponent = trending ? 10 : 0;

  const competitionPenalty = clamp(Math.max(0, competitorCount - 6) * 1.8, 0, 18);
  const riskPenalty = clamp(riskCount * 3.5, 0, 18);

  const rawScore = mentionComponent + engagementComponent + sentimentComponent + trendComponent - competitionPenalty - riskPenalty;
  return clamp(Math.round(rawScore), 0, 100);
}

async function runSource<T>(source: SignalSource, runner: () => Promise<T>): Promise<SourceOutcome<T>> {
  try {
    return {
      source,
      data: await runner(),
      error: null
    };
  } catch (error) {
    return {
      source,
      data: null,
      error: normalizeSourceError(source, error, `Source ${source} failed`)
    };
  }
}

/**
 * Fetches startup validation signals from Reddit, Hacker News, and Product Hunt in parallel.
 */
export async function fetchAllSignals(idea: string, industry: string): Promise<SignalFusionOutput> {
  const normalizedIdea = normalizeWhitespace(idea);
  const normalizedIndustry = normalizeWhitespace(industry);

  if (!normalizedIdea) {
    throw new SourceApiError("reddit", "VALIDATION_ERROR", "fetchAllSignals requires a non-empty idea");
  }

  enforceRateLimit("global", {
    namespace: "signal-fusion-aggregate",
    maxRequests: 30,
    windowMs: 60_000
  });

  const compositeQuery = normalizeWhitespace(`${normalizedIdea} ${normalizedIndustry}`);
  const subreddits = inferSubreddits(normalizedIndustry);

  const [redditResult, hackerNewsResult, productHuntResult] = await Promise.all([
    runSource("reddit", () => searchReddit(compositeQuery, subreddits)),
    runSource("hackernews", () => searchHackerNews(compositeQuery)),
    runSource("producthunt", () => searchProductHunt(compositeQuery))
  ]);

  const redditData = redditResult.data;
  const hackerNewsData = hackerNewsResult.data;
  const productHuntData = productHuntResult.data;

  const painQuotes = buildPainQuotes(redditData, hackerNewsData, productHuntData);
  const competitors = buildCompetitors(redditData, hackerNewsData, productHuntData);

  const totalMentions =
    (redditData?.posts.length ?? 0) +
    (hackerNewsData?.stories.length ?? 0) +
    (hackerNewsData?.comments.length ?? 0) +
    (productHuntData?.products.length ?? 0) +
    (productHuntData?.reviews.length ?? 0);

  const sentimentScore =
    (
      estimateTextSentiment([
        ...(redditData?.posts.map((post) => `${post.title} ${post.quote}`) ?? []),
        ...(hackerNewsData?.stories.map((story) => `${story.title} ${story.excerpt}`) ?? []),
        ...(hackerNewsData?.comments.map((comment) => comment.text) ?? []),
        ...(productHuntData?.reviews.map((review) => review.text) ?? [])
      ]) +
      (productHuntData?.metrics.averageSentiment ?? 0)
    ) /
    2;

  const launchVelocity = productHuntData?.metrics.averageLaunchVelocity ?? 0;
  const trending = launchVelocity >= 5 || totalMentions >= 35;

  const risks: string[] = [];

  for (const sourceResult of [redditResult, hackerNewsResult, productHuntResult]) {
    if (sourceResult.error) {
      risks.push(
        `Reduced confidence: ${sourceResult.source} signal collection failed (${sourceResult.error.code.toLowerCase()}).`
      );
    }
  }

  if (totalMentions < 15) {
    risks.push("Low mention volume across sources; demand signal may be weak or premature.");
  }

  if (painQuotes.length < 4) {
    risks.push("Limited explicit pain quotes found; problem urgency is not yet clear.");
  }

  if (competitors.length > 12) {
    risks.push("Crowded competitive landscape detected; differentiation must be explicit.");
  }

  if (toSentimentLabel(sentimentScore) === "negative") {
    risks.push("Conversation sentiment skews negative; execution and positioning risk are elevated.");
  }

  const totalEngagement =
    painQuotes.reduce((sum, quote) => sum + quote.engagement, 0) +
    (hackerNewsData?.stories.reduce((sum, story) => sum + story.points, 0) ?? 0) +
    (productHuntData?.metrics.totalUpvotes ?? 0);

  const signalScore = computeSignalScore(
    totalMentions,
    sentimentScore,
    trending,
    totalEngagement,
    competitors.length,
    risks.length
  );

  return {
    signalScore,
    painQuotes,
    competitors,
    demandMetrics: {
      totalMentions,
      sentiment: toSentimentLabel(sentimentScore),
      trending
    },
    risks: dedupeBy(risks, (risk) => risk)
  };
}
