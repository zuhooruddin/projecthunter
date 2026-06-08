import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers, runSingleScraper, type ScraperKey } from "@/lib/runScrapers";

const VALID_KEYS: ScraperKey[] = ["rss", "reddit", "hackernews", "devto"];

export async function POST(req: NextRequest) {
  let key: string | null = null;
  try {
    const body = await req.json();
    key = typeof body?.source === "string" ? body.source : null;
  } catch {
    // no body provided - run all scrapers
  }

  try {
    const results =
      key && VALID_KEYS.includes(key as ScraperKey)
        ? await runSingleScraper(key as ScraperKey)
        : await runAllScrapers();

    const totalFound = Object.values(results).reduce((sum, r) => sum + r.found, 0);
    const totalNew = Object.values(results).reduce((sum, r) => sum + r.newItems, 0);

    return NextResponse.json({ results, totalFound, totalNew });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 500 }
    );
  }
}
