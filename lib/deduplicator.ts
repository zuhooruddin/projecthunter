import Fuse from "fuse.js";
import { prisma } from "./prisma";

export interface ScrapedProject {
  title: string;
  description?: string | null;
  url: string;
  source: string;
  company?: string | null;
  country?: string | null;
  role?: string | null;
  techStack?: string[];
  contactEmail?: string | null;
  contactUrl?: string | null;
}

const SIMILARITY_THRESHOLD = 0.2; // Fuse.js score: 0 = perfect match, 1 = no match. <=0.2 ~ >80% similar

/**
 * Returns true if the scraped item is a duplicate (by exact URL or near-duplicate title)
 * of an existing project, and upserts new info onto the existing record when useful.
 */
export async function isDuplicate(item: ScrapedProject): Promise<boolean> {
  const existingByUrl = await prisma.project.findUnique({ where: { url: item.url } });
  if (existingByUrl) {
    await mergeNewInfo(existingByUrl.id, item);
    return true;
  }

  const recent = await prisma.project.findMany({
    select: { id: true, title: true },
    orderBy: { foundAt: "desc" },
    take: 500,
  });
  if (recent.length === 0) return false;

  const fuse = new Fuse(recent, { keys: ["title"], includeScore: true, threshold: 0.4 });
  const results = fuse.search(item.title);
  const match = results.find((r) => (r.score ?? 1) <= SIMILARITY_THRESHOLD);
  if (match) {
    await mergeNewInfo(match.item.id, item);
    return true;
  }

  return false;
}

async function mergeNewInfo(existingId: string, item: ScrapedProject) {
  const existing = await prisma.project.findUnique({ where: { id: existingId } });
  if (!existing) return;

  const data: Record<string, unknown> = {};
  if (!existing.contactEmail && item.contactEmail) data.contactEmail = item.contactEmail;
  if (!existing.contactUrl && item.contactUrl) data.contactUrl = item.contactUrl;
  if (!existing.country && item.country) data.country = item.country;
  if (!existing.description && item.description) data.description = item.description;

  if (Object.keys(data).length > 0) {
    await prisma.project.update({ where: { id: existingId }, data });
  }
}
