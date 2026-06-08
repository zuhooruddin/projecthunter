import * as cheerio from "cheerio";
import { extractEmails } from "./common";
import { extractDomain, isAllowed } from "../geoFilter";

const SUB_PAGES = ["/contact", "/contact-us", "/about", "/team", "/hire-us"];
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

export interface ExtractedContact {
  website: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  contactFormUrl: string | null;
  country: string | null;
  allowed: boolean;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DevProjectHunter/1.0)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractFromHtml(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const text = $("body").text();
  const emails = extractEmails(text + " " + html);
  const phones = Array.from(text.matchAll(PHONE_REGEX))
    .map((m) => m[0].trim())
    .filter((p) => p.replace(/\D/g, "").length >= 7);

  let linkedIn: string | null = null;
  let contactFormUrl: string | null = null;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!linkedIn && /linkedin\.com/i.test(href)) linkedIn = href;
    if (!contactFormUrl && /contact|enquir|inquir/i.test(href)) {
      try {
        contactFormUrl = new URL(href, baseUrl).toString();
      } catch {
        // ignore malformed hrefs
      }
    }
  });

  const company =
    $('meta[property="og:site_name"]').attr("content") ??
    $('meta[name="application-name"]').attr("content") ??
    $("title").first().text().split(/[-|]/)[0]?.trim() ??
    null;

  return {
    text,
    emails,
    phone: phones[0] ?? null,
    linkedIn,
    contactFormUrl,
    company: company || null,
  };
}

/**
 * Crawls the homepage plus a handful of common sub-pages on `websiteUrl`,
 * extracting emails/phones/social links and applying the geo filter.
 */
export async function extractContact(websiteUrl: string): Promise<ExtractedContact | null> {
  const domain = extractDomain(websiteUrl);
  if (!domain) return null;

  const base = websiteUrl.startsWith("http") ? websiteUrl : `https://${domain}`;
  const homeHtml = await fetchHtml(base);
  if (!homeHtml) return null;

  const aggregateEmails = new Set<string>();
  const aggregateText: string[] = [];
  let phone: string | null = null;
  let linkedIn: string | null = null;
  let contactFormUrl: string | null = null;
  let company: string | null = null;

  const home = extractFromHtml(homeHtml, base);
  home.emails.forEach((e) => aggregateEmails.add(e));
  aggregateText.push(home.text);
  phone ??= home.phone;
  linkedIn ??= home.linkedIn;
  contactFormUrl ??= home.contactFormUrl;
  company ??= home.company;

  for (const path of SUB_PAGES) {
    const url = new URL(path, base).toString();
    const html = await fetchHtml(url);
    if (!html) continue;
    const parsed = extractFromHtml(html, url);
    parsed.emails.forEach((e) => aggregateEmails.add(e));
    aggregateText.push(parsed.text);
    phone ??= parsed.phone;
    linkedIn ??= parsed.linkedIn;
    contactFormUrl ??= parsed.contactFormUrl;
  }

  const fullText = aggregateText.join(" ");
  const geo = await isAllowed(base, fullText);

  return {
    website: domain,
    company,
    email: Array.from(aggregateEmails)[0] ?? null,
    phone,
    linkedIn,
    contactFormUrl,
    country: geo.country,
    allowed: geo.allowed,
  };
}
