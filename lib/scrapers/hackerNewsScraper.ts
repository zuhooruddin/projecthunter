import { extractTechStack, saveScrapedProjects, logScrapeError, type SaveResult } from "./common";
import type { ScrapedProject } from "../deduplicator";

const HN_API = "https://hacker-news.firebaseio.com/v0";
const ALGOLIA_API = "https://hn.algolia.com/api/v1/search";
const SOURCE_JOBS = "HackerNews:Jobs";
const SOURCE_HIRING = "HackerNews:WhoIsHiring";

interface HNItem {
  id: number;
  title?: string;
  text?: string;
  url?: string;
  by?: string;
  type?: string;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "DevProjectHunter/1.0" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function scrapeJobStories(): Promise<Record<string, SaveResult>> {
  const results: Record<string, SaveResult> = {};
  try {
    const ids = (await fetchJson<number[]>(`${HN_API}/jobstories.json`)) ?? [];
    const top = ids.slice(0, 40);

    const items: ScrapedProject[] = [];
    for (const id of top) {
      const item = await fetchJson<HNItem>(`${HN_API}/item/${id}.json`);
      if (!item || !item.title) continue;
      const text = decodeHtmlEntities(`${item.title} ${item.text ?? ""}`);
      items.push({
        title: decodeHtmlEntities(item.title.trim()),
        description: decodeHtmlEntities((item.text ?? "").replace(/<[^>]+>/g, " ")).slice(0, 2000),
        url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
        source: SOURCE_JOBS,
        company: null,
        techStack: extractTechStack(text),
      });
    }

    results[SOURCE_JOBS] = await saveScrapedProjects(items, SOURCE_JOBS);
  } catch (err) {
    await logScrapeError(SOURCE_JOBS, err instanceof Error ? err.message : String(err));
    results[SOURCE_JOBS] = { found: 0, newItems: 0 };
  }
  return results;
}

async function scrapeWhoIsHiring(): Promise<Record<string, SaveResult>> {
  const results: Record<string, SaveResult> = {};
  try {
    const search = await fetchJson<{ hits: { objectID: string; title: string; author: string }[] }>(
      `${ALGOLIA_API}?query=Ask HN: Who is hiring&tags=story&hitsPerPage=5`
    );
    const threads = (search?.hits ?? []).filter((h) => /who is hiring/i.test(h.title));
    if (threads.length === 0) {
      results[SOURCE_HIRING] = { found: 0, newItems: 0 };
      return results;
    }

    const latestThreadId = threads[0].objectID;
    const comments = await fetchJson<{ children?: { id: number; text?: string; author?: string }[] }>(
      `https://hn.algolia.com/api/v1/items/${latestThreadId}`
    );

    const items: ScrapedProject[] = [];
    for (const comment of (comments?.children ?? []).slice(0, 100)) {
      if (!comment.text) continue;
      const text = decodeHtmlEntities(comment.text.replace(/<[^>]+>/g, " "));
      if (!/hiring|looking for|remote/i.test(text)) continue;
      const titleLine = text.split("\n")[0].slice(0, 120) || `Hiring post by ${comment.author ?? "unknown"}`;
      items.push({
        title: titleLine.trim(),
        description: text.slice(0, 2000),
        url: `https://news.ycombinator.com/item?id=${comment.id}`,
        source: SOURCE_HIRING,
        company: comment.author ?? null,
        techStack: extractTechStack(text),
      });
    }

    results[SOURCE_HIRING] = await saveScrapedProjects(items, SOURCE_HIRING);
  } catch (err) {
    await logScrapeError(SOURCE_HIRING, err instanceof Error ? err.message : String(err));
    results[SOURCE_HIRING] = { found: 0, newItems: 0 };
  }
  return results;
}

export async function scrapeHackerNews(): Promise<Record<string, SaveResult>> {
  const [jobs, hiring] = await Promise.all([scrapeJobStories(), scrapeWhoIsHiring()]);
  return { ...jobs, ...hiring };
}
