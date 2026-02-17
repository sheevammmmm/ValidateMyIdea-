/**
 * Shared signal models and centralized error/retry utilities for external API integrations.
 */

export type SignalSource = "reddit" | "hackernews" | "producthunt";

export type Sentiment = "positive" | "neutral" | "negative";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "CONFIG_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN_ERROR";

export interface Post {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  quote: string;
  upvotes: number;
  relevanceScore: number;
  createdAt?: string;
}

export interface Story {
  id: string;
  title: string;
  url: string;
  points: number;
  commentsCount: number;
  author: string;
  excerpt: string;
  relevanceScore: number;
  technicalSignals: string[];
  sentimentScore: number;
  createdAt?: string;
}

export interface Comment {
  id: string;
  storyId: string;
  storyTitle: string;
  storyUrl: string;
  text: string;
  author: string;
  points: number;
  relevanceScore: number;
  technicalSignals: string[];
  sentimentScore: number;
  createdAt?: string;
}

export interface Launch {
  id: string;
  title: string;
  url: string;
  points: number;
  commentsCount: number;
  relevanceScore: number;
  technicalSignals: string[];
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  url: string;
  website?: string;
  upvotes: number;
  commentsCount: number;
  launchVelocity: number;
  pricing?: string;
  relevanceScore: number;
  createdAt?: string;
}

export interface Review {
  id: string;
  productName: string;
  text: string;
  sentiment: Sentiment;
  sentimentScore: number;
  engagement: number;
  url: string;
  createdAt?: string;
}

export interface Metrics {
  totalProducts: number;
  totalUpvotes: number;
  totalComments: number;
  averageLaunchVelocity: number;
  averageSentiment: number;
}

export interface RedditSignalResult {
  posts: Post[];
  painPoints: string[];
  competitors: string[];
}

export interface HackerNewsSignalResult {
  stories: Story[];
  comments: Comment[];
  launches: Launch[];
}

export interface ProductHuntSignalResult {
  products: Product[];
  metrics: Metrics;
  reviews: Review[];
}

export interface PainQuote {
  text: string;
  source: string;
  engagement: number;
  url: string;
}

export interface CompetitorSignal {
  name: string;
  description: string;
  pricing?: string;
  url: string;
}

export interface SignalFusionOutput {
  signalScore: number;
  painQuotes: PainQuote[];
  competitors: CompetitorSignal[];
  demandMetrics: {
    totalMentions: number;
    sentiment: Sentiment;
    trending: boolean;
  };
  risks: string[];
}

export interface RetryOptions {
  source: SignalSource;
  operation: string;
  retries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface ErrorContext {
  status?: number;
  retryable?: boolean;
  details?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * Standardized source error used across all integration modules.
 */
export class SourceApiError extends Error {
  public readonly source: SignalSource;
  public readonly code: ApiErrorCode;
  public readonly status?: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: unknown;

  constructor(source: SignalSource, code: ApiErrorCode, message: string, context: ErrorContext = {}) {
    super(message);
    this.name = "SourceApiError";
    this.source = source;
    this.code = code;
    this.status = context.status;
    this.retryable = context.retryable ?? false;
    this.details = context.details;
    this.cause = context.cause;
  }
}

/**
 * Runtime guard for record-like JSON values.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Normalizes unknown thrown values into a structured SourceApiError.
 */
export function normalizeSourceError(source: SignalSource, error: unknown, fallbackMessage: string): SourceApiError {
  if (error instanceof SourceApiError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.name === "RateLimitExceededError") {
      const retryAfterCandidate = (error as unknown as { retryAfterMs?: unknown }).retryAfterMs;
      const retryAfterMs = typeof retryAfterCandidate === "number" ? retryAfterCandidate : undefined;

      return new SourceApiError(source, "RATE_LIMITED", `${fallbackMessage}: outbound rate limit exceeded`, {
        retryable: true,
        details: {
          retryAfterMs
        },
        cause: error
      });
    }

    if (error.name === "AbortError") {
      return new SourceApiError(source, "TIMEOUT", `${fallbackMessage}: request timed out`, {
        retryable: true,
        cause: error
      });
    }

    return new SourceApiError(source, "UNKNOWN_ERROR", `${fallbackMessage}: ${error.message}`, {
      retryable: false,
      cause: error
    });
  }

  return new SourceApiError(source, "UNKNOWN_ERROR", fallbackMessage, {
    retryable: false,
    cause: error
  });
}

/**
 * Returns true when an error should be retried by the generic retry helper.
 */
export function shouldRetryError(error: unknown): boolean {
  if (error instanceof SourceApiError) {
    return error.retryable;
  }

  if (error instanceof Error) {
    return error.name === "AbortError" || error.name === "TypeError" || error.name === "RateLimitExceededError";
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Runs an async operation with bounded retries and exponential backoff.
 */
export async function withRetries<T>(runner: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 2_500;

  let lastError: unknown;

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      return await runner(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= options.retries || !shouldRetryError(error)) {
        break;
      }

      const jitterMs = Math.floor(Math.random() * 100);
      const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1) + jitterMs);
      await sleep(delayMs);
    }
  }

  throw normalizeSourceError(
    options.source,
    lastError,
    `${options.operation} failed after ${options.retries} attempt${options.retries === 1 ? "" : "s"}`
  );
}
