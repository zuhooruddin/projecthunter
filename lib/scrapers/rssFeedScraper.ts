import Parser from "rss-parser";
import { extractTechStack, saveScrapedProjects, logScrapeError, type SaveResult } from "./common";
import type { ScrapedProject } from "../deduplicator";

const FEEDS: { url: string; source: string }[] = [
  { url: "https://remotive.com/remote-jobs/feed?category=software-dev", source: "RSS:Remotive" },
  { url: "https://weworkremotely.com/categories/remote-programming-jobs.rss", source: "RSS:WeWorkRemotely" },
  { url: "https://www.authenticjobs.com/feed/", source: "RSS:AuthenticJobs" },
  { url: "https://jobicy.com/?feed=job_feed&job_category=engineering", source: "RSS:Jobicy" },
  { url: "https://remote.co/remote-jobs/developer/feed/", source: "RSS:RemoteCo" },
];

const parser = new Parser({
  timeout: 30000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; DevProjectHunter/1.0)" },
});

function guessCompany(title: string): string | null {
  // Many feeds format titles as "Company: Role" or "Role at Company"
  const atMatch = title.match(/\bat\s+([A-Z][\w&.,' -]{1,40})$/);
  if (atMatch) return atMatch[1].trim();
  const colonMatch = title.match(/^([\w&.,' -]{2,40}):\s/);
  if (colonMatch) return colonMatch[1].trim();
  return null;
}

export async function scrapeRssFeeds(): Promise<Record<string, SaveResult>> {
  const results: Record<string, SaveResult> = {};

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items: ScrapedProject[] = (parsed.items ?? [])
        .filter((entry) => entry.link && entry.title)
        .map((entry) => {
          const text = `${entry.title ?? ""} ${entry.contentSnippet ?? entry.content ?? ""}`;
          return {
            title: entry.title!.trim(),
            description: (entry.contentSnippet ?? entry.content ?? "").slice(0, 2000),
            url: entry.link!,
            source: feed.source,
            company: guessCompany(entry.title!.trim()),
            techStack: extractTechStack(text),
          };
        });

      results[feed.source] = await saveScrapedProjects(items, feed.source);
    } catch (err) {
      await logScrapeError(feed.source, err instanceof Error ? err.message : String(err));
      results[feed.source] = { found: 0, newItems: 0 };
    }
  }

  return results;
}
