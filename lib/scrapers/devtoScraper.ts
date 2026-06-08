import { extractTechStack, saveScrapedProjects, logScrapeError, type SaveResult } from "./common";
import type { ScrapedProject } from "../deduplicator";

const CATEGORIES: { category: string; source: string }[] = [
  { category: "cfp", source: "DevTo:CFP" },
  { category: "forhire", source: "DevTo:ForHire" },
];

interface DevToListing {
  id: number;
  title: string;
  body_markdown?: string;
  slug: string;
  user?: { name?: string };
  category?: string;
  tag_list?: string[];
}

export async function scrapeDevTo(): Promise<Record<string, SaveResult>> {
  const results: Record<string, SaveResult> = {};

  for (const { category, source } of CATEGORIES) {
    try {
      const res = await fetch(`https://dev.to/api/listings?category=${category}&per_page=100`, {
        headers: { "User-Agent": "DevProjectHunter/1.0" },
      });
      if (!res.ok) throw new Error(`Dev.to returned ${res.status}`);
      const listings: DevToListing[] = await res.json();

      const items: ScrapedProject[] = listings
        .filter((l) => /hir|develop|engineer|programm|contract|freelance/i.test(`${l.title} ${l.body_markdown ?? ""}`))
        .map((l) => {
          const text = `${l.title} ${l.body_markdown ?? ""} ${(l.tag_list ?? []).join(" ")}`;
          return {
            title: l.title.trim(),
            description: (l.body_markdown ?? "").slice(0, 2000),
            url: `https://dev.to/${l.slug}`,
            source,
            company: l.user?.name ?? null,
            techStack: Array.from(new Set([...extractTechStack(text), ...(l.tag_list ?? [])])),
          };
        });

      results[source] = await saveScrapedProjects(items, source);
    } catch (err) {
      await logScrapeError(source, err instanceof Error ? err.message : String(err));
      results[source] = { found: 0, newItems: 0 };
    }
  }

  return results;
}
