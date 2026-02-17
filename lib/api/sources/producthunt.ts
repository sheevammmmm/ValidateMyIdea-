import { buildCacheKey, getOrSetCache } from "@/lib/api/cache/redis";
import { enforceRateLimit } from "@/lib/api/ratelimit";
import {
  type Metrics,
  type Product,
  type ProductHuntSignalResult,
  type Review,
  type Sentiment,
  SourceApiError,
  isRecord,
  normalizeSourceError,
  withRetries
} from "@/lib/api/types/signals";

const PRODUCT_HUNT_ENDPOINT = "https://api.producthunt.com/v2/api/graphql";
const PRODUCT_HUNT_CACHE_TTL_SECONDS = 30 * 60;
const PRODUCT_LIMIT = 12;
const REVIEW_LIMIT = 30;

const POSITIVE_WORDS = ["love", "great", "excellent", "useful", "helpful", "fast", "amazing", "solid", "clean", "easy"] as const;
const NEGATIVE_WORDS = ["bad", "poor", "slow", "expensive", "buggy", "broken", "confusing", "difficult", "hate", "unreliable"] as const;

const QUERY_VARIANTS: Array<{ name: string; document: string; variables: (query: string) => Record<string, unknown> }> = [
  {
    name: "search-with-comments",
    document: `
      query SearchPosts($query: String!, $first: Int!) {
        posts(first: $first, query: $query) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              website
              createdAt
              votesCount
              commentsCount
              topics(first: 5) {
                edges {
                  node {
                    name
                  }
                }
              }
              comments(first: 10) {
                edges {
                  node {
                    id
                    body
                    createdAt
                    votesCount
                    user {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    variables: (query: string) => ({ query, first: PRODUCT_LIMIT })
  },
  {
    name: "search-basic",
    document: `
      query SearchPostsBasic($query: String!, $first: Int!) {
        posts(first: $first, query: $query) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              website
              createdAt
              votesCount
              commentsCount
              topics(first: 5) {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `,
    variables: (query: string) => ({ query, first: PRODUCT_LIMIT })
  },
  {
    name: "recent-fallback",
    document: `
      query RecentPosts($first: Int!) {
        posts(first: $first) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              website
              createdAt
              votesCount
              commentsCount
            }
          }
        }
      }
    `,
    variables: () => ({ first: PRODUCT_LIMIT })
  }
];

interface ProductNode {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  website?: string;
  createdAt?: string;
  votesCount: number;
  commentsCount: number;
  topics: string[];
  comments: Array<{
    id: string;
    body: string;
    createdAt?: string;
    votesCount: number;
  }>;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenize(input: string): string[] {
  return normalizeWhitespace(input)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2);
}

function parseString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? normalizeWhitespace(value) : fallback;
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

function countTokenMatches(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;

  for (const token of tokens) {
    if (lower.includes(token)) {
      count += 1;
    }
  }

  return count;
}

function computeRelevance(query: string, text: string): number {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return 0;
  }

  const coverage = countTokenMatches(text, tokens) / tokens.length;
  return Math.max(0, Math.min(1, Number(coverage.toFixed(4))));
}

function extractPricing(text: string): string | undefined {
  const cleaned = normalizeWhitespace(text);
  if (!cleaned) {
    return undefined;
  }

  const pricingRegex = /\$\s?\d+(?:\.\d{1,2})?(?:\s?(?:\/|per\s)(?:mo|month|yr|year|user|seat))?/i;
  const match = cleaned.match(pricingRegex);

  return match?.[0];
}

function extractEdges(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return [];
  }

  const posts = payload.data.posts;
  if (!isRecord(posts) || !Array.isArray(posts.edges)) {
    return [];
  }

  return posts.edges.filter((edge): edge is Record<string, unknown> => isRecord(edge));
}

function parseProductNodes(payload: unknown): ProductNode[] {
  const edges = extractEdges(payload);
  const nodes: ProductNode[] = [];

  for (const edge of edges) {
    const node = edge.node;
    if (!isRecord(node)) {
      continue;
    }

    const id = parseString(node.id);
    const name = parseString(node.name);
    if (!id || !name) {
      continue;
    }

    const tagline = parseString(node.tagline);
    const description = parseString(node.description);
    const url = parseString(node.url);
    const website = parseString(node.website) || undefined;
    const createdAt = parseString(node.createdAt) || undefined;
    const votesCount = parseNumber(node.votesCount);
    const commentsCount = parseNumber(node.commentsCount);

    const topics: string[] = [];
    if (isRecord(node.topics) && Array.isArray(node.topics.edges)) {
      for (const topicEdge of node.topics.edges) {
        if (!isRecord(topicEdge) || !isRecord(topicEdge.node)) {
          continue;
        }

        const topicName = parseString(topicEdge.node.name);
        if (topicName) {
          topics.push(topicName);
        }
      }
    }

    const comments: ProductNode["comments"] = [];
    if (isRecord(node.comments) && Array.isArray(node.comments.edges)) {
      for (const commentEdge of node.comments.edges) {
        if (!isRecord(commentEdge) || !isRecord(commentEdge.node)) {
          continue;
        }

        const commentId = parseString(commentEdge.node.id);
        const body = parseString(commentEdge.node.body);
        if (!commentId || !body) {
          continue;
        }

        comments.push({
          id: commentId,
          body,
          createdAt: parseString(commentEdge.node.createdAt) || undefined,
          votesCount: parseNumber(commentEdge.node.votesCount)
        });
      }
    }

    nodes.push({
      id,
      name,
      tagline,
      description,
      url,
      website,
      createdAt,
      votesCount,
      commentsCount,
      topics,
      comments
    });
  }

  return nodes;
}

function analyzeSentiment(text: string): { sentiment: Sentiment; sentimentScore: number } {
  const lower = text.toLowerCase();

  const positive = POSITIVE_WORDS.reduce((count, word) => (lower.includes(word) ? count + 1 : count), 0);
  const negative = NEGATIVE_WORDS.reduce((count, word) => (lower.includes(word) ? count + 1 : count), 0);

  if (positive === 0 && negative === 0) {
    return {
      sentiment: "neutral",
      sentimentScore: 0
    };
  }

  const sentimentScore = Number(((positive - negative) / (positive + negative)).toFixed(4));

  if (sentimentScore > 0.15) {
    return { sentiment: "positive", sentimentScore };
  }

  if (sentimentScore < -0.15) {
    return { sentiment: "negative", sentimentScore };
  }

  return {
    sentiment: "neutral",
    sentimentScore
  };
}

function toLaunchVelocity(votesCount: number, createdAt?: string): number {
  if (!createdAt) {
    return Number(votesCount.toFixed(2));
  }

  const createdTime = Date.parse(createdAt);
  if (Number.isNaN(createdTime)) {
    return Number(votesCount.toFixed(2));
  }

  const elapsedHours = Math.max(1, (Date.now() - createdTime) / (1000 * 60 * 60));
  return Number((votesCount / elapsedHours).toFixed(2));
}

async function executeGraphQL(document: string, variables: Record<string, unknown>, token: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(PRODUCT_HUNT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        query: document,
        variables
      }),
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new SourceApiError("producthunt", "UPSTREAM_ERROR", `Product Hunt returned status ${response.status}`, {
        status: response.status,
        retryable: response.status === 429 || response.status >= 500
      });
    }

    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof SourceApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new SourceApiError("producthunt", "TIMEOUT", "Product Hunt request timed out", {
        retryable: true,
        cause: error
      });
    }

    throw new SourceApiError("producthunt", "NETWORK_ERROR", "Failed to call Product Hunt API", {
      retryable: true,
      cause: error
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractGraphQlErrors(payload: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.errors)) {
    return [];
  }

  const messages: string[] = [];

  for (const error of payload.errors) {
    if (!isRecord(error) || typeof error.message !== "string") {
      continue;
    }

    messages.push(error.message);
  }

  return messages;
}

async function fetchProductNodes(query: string, token: string): Promise<ProductNode[]> {
  let lastNonAuthError: SourceApiError | null = null;

  for (const variant of QUERY_VARIANTS) {
    const payload = await withRetries(
      async () => executeGraphQL(variant.document, variant.variables(query), token),
      {
        source: "producthunt",
        operation: `Product Hunt query (${variant.name})`,
        retries: 3,
        baseDelayMs: 250,
        maxDelayMs: 1_500
      }
    );

    const graphQlErrors = extractGraphQlErrors(payload);
    if (graphQlErrors.length > 0) {
      const combined = graphQlErrors.join(" | ");
      const unauthorized = /unauthoriz|forbidden|token/i.test(combined);

      if (unauthorized) {
        throw new SourceApiError("producthunt", "AUTH_ERROR", `Product Hunt authorization failed: ${combined}`, {
          retryable: false
        });
      }

      lastNonAuthError = new SourceApiError("producthunt", "UPSTREAM_ERROR", `Product Hunt GraphQL error: ${combined}`, {
        retryable: false
      });
      continue;
    }

    const nodes = parseProductNodes(payload);
    if (nodes.length > 0) {
      return nodes;
    }
  }

  if (lastNonAuthError) {
    throw lastNonAuthError;
  }

  return [];
}

/**
 * Queries Product Hunt GraphQL for similar products, launch metrics, and review sentiment.
 */
export async function searchProductHunt(query: string): Promise<ProductHuntSignalResult> {
  const normalizedQuery = normalizeWhitespace(query);

  if (!normalizedQuery) {
    throw new SourceApiError("producthunt", "VALIDATION_ERROR", "searchProductHunt requires a non-empty query");
  }

  const token = process.env.PRODUCTHUNT_API_KEY ?? process.env.PRODUCT_HUNT_ACCESS_TOKEN;
  if (!token) {
    throw new SourceApiError("producthunt", "CONFIG_ERROR", "Missing PRODUCTHUNT_API_KEY environment variable", {
      details: {
        acceptedEnv: ["PRODUCTHUNT_API_KEY", "PRODUCT_HUNT_ACCESS_TOKEN"]
      }
    });
  }

  const cacheKey = buildCacheKey("producthunt", {
    query: normalizedQuery.toLowerCase()
  });

  return getOrSetCache(cacheKey, PRODUCT_HUNT_CACHE_TTL_SECONDS, async () => {
    enforceRateLimit("global", {
      namespace: "producthunt-search",
      maxRequests: 40,
      windowMs: 60_000
    });

    try {
      const nodes = await fetchProductNodes(normalizedQuery, token);

      const products: Product[] = nodes
        .map((node) => {
          const combinedText = `${node.name} ${node.tagline} ${node.description} ${node.topics.join(" ")}`;
          const relevanceScore = computeRelevance(normalizedQuery, combinedText);
          const pricing = extractPricing(`${node.tagline} ${node.description}`);

          return {
            id: node.id,
            name: node.name,
            description: normalizeWhitespace([node.tagline, node.description].filter(Boolean).join(" - ")),
            url: node.url,
            website: node.website,
            upvotes: node.votesCount,
            commentsCount: node.commentsCount,
            launchVelocity: toLaunchVelocity(node.votesCount, node.createdAt),
            pricing,
            relevanceScore,
            createdAt: node.createdAt
          };
        })
        .filter((product) => product.relevanceScore >= 0.1)
        .sort((left, right) => {
          if (right.relevanceScore !== left.relevanceScore) {
            return right.relevanceScore - left.relevanceScore;
          }

          return right.upvotes - left.upvotes;
        })
        .slice(0, PRODUCT_LIMIT);

      const reviews: Review[] = nodes
        .flatMap((node) => {
          const baseUrl = node.url || "https://www.producthunt.com";

          return node.comments.map((comment) => {
            const analysis = analyzeSentiment(comment.body);

            return {
              id: comment.id,
              productName: node.name,
              text: comment.body,
              sentiment: analysis.sentiment,
              sentimentScore: analysis.sentimentScore,
              engagement: comment.votesCount,
              url: baseUrl,
              createdAt: comment.createdAt
            };
          });
        })
        .sort((left, right) => {
          if (right.engagement !== left.engagement) {
            return right.engagement - left.engagement;
          }

          return right.sentimentScore - left.sentimentScore;
        })
        .slice(0, REVIEW_LIMIT);

      const totalUpvotes = products.reduce((sum, product) => sum + product.upvotes, 0);
      const totalComments = products.reduce((sum, product) => sum + product.commentsCount, 0);
      const averageLaunchVelocity =
        products.length > 0
          ? Number((products.reduce((sum, product) => sum + product.launchVelocity, 0) / products.length).toFixed(2))
          : 0;
      const averageSentiment =
        reviews.length > 0
          ? Number((reviews.reduce((sum, review) => sum + review.sentimentScore, 0) / reviews.length).toFixed(4))
          : 0;

      const metrics: Metrics = {
        totalProducts: products.length,
        totalUpvotes,
        totalComments,
        averageLaunchVelocity,
        averageSentiment
      };

      return {
        products,
        metrics,
        reviews
      };
    } catch (error) {
      throw normalizeSourceError("producthunt", error, "Failed to fetch Product Hunt signals");
    }
  });
}
