import { prisma } from "./prisma";

const EXCLUDED_TLDS = [
  "cn", "jp", "kr", "in", "pk", "bd", "lk", "my", "id", "ph",
  "vn", "th", "mm", "kh", "la", "np", "bt", "mv",
];

const EXCLUDED_COUNTRIES = [
  "China", "Japan", "South Korea", "India", "Pakistan", "Bangladesh",
  "Sri Lanka", "Malaysia", "Indonesia", "Philippines", "Vietnam",
  "Thailand", "Myanmar", "Cambodia", "Laos", "Nepal", "Bhutan", "Maldives",
];

const ALLOWED_COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "Netherlands", "France", "United Arab Emirates", "Saudi Arabia",
];

export function extractDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function tldOf(domain: string): string {
  const parts = domain.split(".");
  return parts[parts.length - 1].toLowerCase();
}

export function detectCountryFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const country of [...ALLOWED_COUNTRIES, ...EXCLUDED_COUNTRIES]) {
    if (lower.includes(country.toLowerCase())) return country;
  }
  if (lower.includes(" usa") || lower.includes("u.s.a") || lower.includes(" us ")) return "United States";
  if (lower.includes(" uk ") || lower.includes("united kingdom")) return "United Kingdom";
  return null;
}

async function geolocateDomain(domain: string): Promise<{ country: string | null; allowed: boolean }> {
  const cached = await prisma.geoCache.findUnique({ where: { domain } });
  if (cached) return { country: cached.country, allowed: cached.allowed };

  let country: string | null = null;
  let allowed = true;
  try {
    const res = await fetch(`http://ip-api.com/json/${domain}`);
    if (res.ok) {
      const data = await res.json();
      country = data.country ?? null;
      if (country && EXCLUDED_COUNTRIES.includes(country)) allowed = false;
    }
  } catch {
    // network failure - default to allowed, don't block on geolocation errors
  }

  await prisma.geoCache.upsert({
    where: { domain },
    create: { domain, country, allowed },
    update: { country, allowed, checkedAt: new Date() },
  });

  return { country, allowed };
}

/**
 * Decides whether a project/contact tied to `url` (and optionally raw page text)
 * should be kept, based on TLD blacklist, detected country text, and IP geolocation.
 */
export async function isAllowed(
  url: string,
  pageText?: string
): Promise<{ allowed: boolean; country: string | null }> {
  const domain = extractDomain(url);
  if (!domain) return { allowed: true, country: null };

  if (EXCLUDED_TLDS.includes(tldOf(domain))) {
    return { allowed: false, country: null };
  }

  if (pageText) {
    const detected = detectCountryFromText(pageText);
    if (detected) {
      if (EXCLUDED_COUNTRIES.includes(detected)) return { allowed: false, country: detected };
      return { allowed: true, country: detected };
    }
  }

  const geo = await geolocateDomain(domain);
  return { allowed: geo.allowed, country: geo.country };
}
