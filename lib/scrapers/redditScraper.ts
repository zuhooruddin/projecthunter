import { extractTechStack, saveScrapedProjects, logScrapeError, type SaveResult } from "./common";
import type { ScrapedProject } from "../deduplicator";

const SUBREDDITS: { name: string; source: string; requireHiring?: boolean }[] = [
  { name: "forhire", source: "Reddit:r/forhire" },
  { name: "hiring", source: "Reddit:r/hiring" },
  { name: "webdev", source: "Reddit:r/webdev", requireHiring: true },
  { name: "reactjs", source: "Reddit:r/reactjs", requireHiring: true },
  { name: "node", source: "Reddit:r/node", requireHiring: true },
];

const ASIA_HINTS = [
  "india", "pakistan", "bangladesh", "philippines", "vietnam", "indonesia",
  "china", "japan", "korea", "malaysia", "thailand", "sri lanka",
];

interface RedditChild {
  data: {
    title: string;
    selftext?: string;
    permalink: string;
    link_flair_text?: string | null;
    author?: string;
  };
}

function guessCompany(title: string, body: string): string | null {
  const m = title.match(/\[Hiring\]\s*([\w&.,' -]{2,40})/i) || body.match(/company[:\s]+([\w&.,' -]{2,40})/i);
  return m ? m[1].trim() : null;
}

export async function scrapeReddit(): Promise<Record<string, SaveResult>> {
  const results: Record<string, SaveResult> = {};

  for (const sub of SUBREDDITS) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub.name}/new.json?limit=100`, {
        headers: { "User-Agent": "DevProjectHunter/1.0 (by u/anonymous)" },
      });
      if (!res.ok) throw new Error(`Reddit returned ${res.status}`);
      const json = await res.json();
      const children: RedditChild[] = json?.data?.children ?? [];

      const items: ScrapedProject[] = [];
      for (const child of children) {
        const { title, selftext = "", permalink, link_flair_text } = child.data;
        const text = `${title} ${selftext}`;
        const lower = text.toLowerCase();

        const isHiring = /hiring|looking for|seeking|need a/i.test(title) ||
          (link_flair_text ?? "").toLowerCase().includes("hiring");
        if (sub.requireHiring && !isHiring) continue;

        if (ASIA_HINTS.some((hint) => lower.includes(hint))) continue;

        items.push({
          title: title.trim(),
          description: selftext.slice(0, 2000),
          url: `https://www.reddit.com${permalink}`,
          source: sub.source,
          company: guessCompany(title, selftext),
          techStack: extractTechStack(text),
        });
      }

      results[sub.source] = await saveScrapedProjects(items, sub.source);
    } catch (err) {
      await logScrapeError(sub.source, err instanceof Error ? err.message : String(err));
      results[sub.source] = { found: 0, newItems: 0 };
    }
  }

  return results;
}
