import { prisma } from "../prisma";
import { isDuplicate, type ScrapedProject } from "../deduplicator";
import { isAllowed } from "../geoFilter";

const TECH_KEYWORDS = [
  "React", "Next.js", "Vue", "Angular", "Svelte", "Node.js", "Express",
  "TypeScript", "JavaScript", "Python", "Django", "Flask", "FastAPI",
  "Ruby", "Rails", "PHP", "Laravel", "Java", "Spring", "Go", "Golang",
  "Rust", "C#", ".NET", "Kotlin", "Swift", "Flutter", "React Native",
  "GraphQL", "REST", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Tailwind", "Prisma",
  "Solidity", "Web3", "Shopify", "WordPress",
];

export function extractTechStack(text: string): string[] {
  const found = new Set<string>();
  for (const tech of TECH_KEYWORDS) {
    const re = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) found.add(tech);
  }
  return Array.from(found);
}

export type DevRole = "Full Stack Developer" | "Web Developer" | "Mobile Developer";

const JOB_TITLE_WORD = /\b(developer|engineer|dev|programmer)\b/i;

// Roles that should never be tagged as Full Stack/Web/Mobile, even though they
// often contain the word "developer"/"engineer" in adjacent listings.
const EXCLUDED_ROLE_PATTERN =
  /\b(devops|site reliability|sre|data (engineer|scientist|analyst)|machine learning|ml engineer|ai engineer|qa|quality assurance|test(er|ing)? engineer|security engineer|game (developer|engineer)|embedded|blockchain|solidity|firmware|hardware|designer|product manager|project manager|product owner|recruiter|sales|marketing|support engineer|cloud engineer|platform engineer|infrastructure engineer|database administrator|dba)\b/i;

const ROLE_PATTERNS: { role: DevRole; pattern: RegExp }[] = [
  { role: "Mobile Developer", pattern: /\b(mobile|ios|android|react native|flutter|swift|kotlin|swiftui|jetpack compose)\b.*\b(developer|engineer|dev)\b|\b(developer|engineer|dev)\b.*\b(mobile|ios|android|react native|flutter)\b/i },
  { role: "Full Stack Developer", pattern: /\bfull[\s-]?stack\b/i },
  { role: "Web Developer", pattern: /\b(web|frontend|front-end|front end|backend|back-end|back end|fullstack)\b.*\b(developer|engineer|dev)\b|\b(developer|engineer|dev)\b.*\b(web|frontend|backend)\b/i },
];

/**
 * Classifies free text into one of our three target role categories,
 * or null if it doesn't look like a Full Stack/Web/Mobile developer job listing.
 * Requires an explicit job-title word ("developer"/"engineer"/...) so generic
 * articles/listicles don't get tagged, and excludes adjacent disciplines
 * (DevOps, QA, data, design, etc.) that often co-occur with "developer".
 */
export function classifyRole(text: string): DevRole | null {
  if (!JOB_TITLE_WORD.test(text)) return null;
  if (EXCLUDED_ROLE_PATTERN.test(text)) return null;

  for (const { role, pattern } of ROLE_PATTERNS) {
    if (pattern.test(text)) return role;
  }
  // Generic "software developer/engineer" with no other discipline context —
  // treat as Web Developer (the most common general-purpose dev role).
  if (/\b(software (developer|engineer)|programmer)\b/i.test(text)) return "Web Developer";
  return null;
}

export function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  return Array.from(new Set(matches)).filter((e) => !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(e));
}

export async function getExcludedKeywords(): Promise<string[]> {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings) return [];
  try {
    const data = JSON.parse(settings.data);
    return Array.isArray(data.excludedKeywords) ? data.excludedKeywords : [];
  } catch {
    return [];
  }
}

export function isExcluded(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => kw.trim() && lower.includes(kw.trim().toLowerCase()));
}

export interface SaveResult {
  found: number;
  newItems: number;
}

/**
 * Filters duplicates/excluded/disallowed-geo items and persists the rest as Projects.
 */
export async function saveScrapedProjects(items: ScrapedProject[], source: string): Promise<SaveResult> {
  const excludedKeywords = await getExcludedKeywords();
  let newItems = 0;

  for (const item of items) {
    const haystack = `${item.title} ${item.description ?? ""}`;
    if (isExcluded(haystack, excludedKeywords)) continue;

    const role = item.role ?? classifyRole(haystack);
    if (!role) continue; // only keep Full Stack / Web / Mobile Developer roles

    if (await isDuplicate(item)) continue;

    let country = item.country ?? null;
    if (!country) {
      const geo = await isAllowed(item.url, haystack);
      if (!geo.allowed) continue;
      country = geo.country;
    }

    await prisma.project.create({
      data: {
        title: item.title,
        description: item.description ?? null,
        url: item.url,
        source,
        company: item.company ?? null,
        country,
        role,
        techStack: item.techStack ?? extractTechStack(haystack),
        contactEmail: item.contactEmail ?? null,
        contactUrl: item.contactUrl ?? null,
      },
    });
    newItems++;
  }

  await prisma.scrapeLog.create({
    data: { source, found: items.length, newItems },
  });

  return { found: items.length, newItems };
}

export async function logScrapeError(source: string, error: string) {
  await prisma.scrapeLog.create({ data: { source, found: 0, newItems: 0, error } });
}
