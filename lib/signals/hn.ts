export type Signal = {
  text: string;
  source: "hn";
  engagement: number;
  url: string;
};

type HNHit = {
  objectID?: string;
  title?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  points?: number | null;
  url?: string | null;
  story_url?: string | null;
};

type HNSearchResponse = {
  hits?: HNHit[];
};

const HN_SEARCH_ENDPOINT = "https://hn.algolia.com/api/v1/search";
const MAX_HITS = 10;

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ");
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanText(input: string): string {
  const withoutTags = stripHtml(input);
  const decoded = decodeHtmlEntities(withoutTags);

  return decoded.replace(/\s+/g, " ").trim();
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toSignal(hit: HNHit): Signal | null {
  const rawText = toStringOrEmpty(hit.comment_text) || toStringOrEmpty(hit.story_text) || toStringOrEmpty(hit.title);
  const text = cleanText(rawText);

  if (!text) {
    return null;
  }

  const directUrl = toStringOrEmpty(hit.url) || toStringOrEmpty(hit.story_url);
  const fallbackUrl = hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : "https://news.ycombinator.com";

  return {
    text,
    source: "hn",
    engagement: toNumber(hit.points),
    url: directUrl || fallbackUrl
  };
}

export async function fetchHNSignals(query: string): Promise<Signal[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  try {
    const url = new URL(HN_SEARCH_ENDPOINT);
    url.searchParams.set("query", normalizedQuery);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as HNSearchResponse;
    const hits = Array.isArray(payload.hits) ? payload.hits.slice(0, MAX_HITS) : [];

    const signals = hits
      .map(toSignal)
      .filter((signal): signal is Signal => signal !== null)
      .sort((a, b) => b.engagement - a.engagement);

    return signals;
  } catch {
    return [];
  }
}
