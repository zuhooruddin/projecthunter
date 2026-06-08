import { scrapeRssFeeds } from "./scrapers/rssFeedScraper";
import { scrapeReddit } from "./scrapers/redditScraper";
import { scrapeHackerNews } from "./scrapers/hackerNewsScraper";
import { scrapeDevTo } from "./scrapers/devtoScraper";
import { prisma } from "./prisma";
import type { SaveResult } from "./scrapers/common";

export type ScraperKey = "rss" | "reddit" | "hackernews" | "devto";

const SCRAPERS: Record<ScraperKey, () => Promise<Record<string, SaveResult>>> = {
  rss: scrapeRssFeeds,
  reddit: scrapeReddit,
  hackernews: scrapeHackerNews,
  devto: scrapeDevTo,
};

async function getEnabledScrapers(): Promise<ScraperKey[]> {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings) return Object.keys(SCRAPERS) as ScraperKey[];
  try {
    const data = JSON.parse(settings.data);
    const enabled = data.enabledScrapers as Record<string, boolean> | undefined;
    if (!enabled) return Object.keys(SCRAPERS) as ScraperKey[];
    return (Object.keys(SCRAPERS) as ScraperKey[]).filter((key) => enabled[key] !== false);
  } catch {
    return Object.keys(SCRAPERS) as ScraperKey[];
  }
}

export async function runAllScrapers(): Promise<Record<string, SaveResult>> {
  const enabled = await getEnabledScrapers();
  const allResults: Record<string, SaveResult> = {};

  for (const key of enabled) {
    const results = await SCRAPERS[key]();
    Object.assign(allResults, results);
  }

  return allResults;
}

export async function runSingleScraper(key: ScraperKey): Promise<Record<string, SaveResult>> {
  return SCRAPERS[key]();
}
