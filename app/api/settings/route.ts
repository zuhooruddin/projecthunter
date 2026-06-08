import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getDefaultTemplates } from "@/lib/coverLetterGenerator";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  profile: { name: "", skills: [] as string[], portfolioUrl: "", yearsExperience: 0, hourlyRate: 0 },
  enabledScrapers: { rss: true, reddit: true, hackernews: true, devto: true },
  scrapeInterval: "6h",
  excludedKeywords: ["intern", "unpaid"],
  excludedDomains: [] as string[],
  templates: getDefaultTemplates(),
};

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings) return NextResponse.json(DEFAULTS);
  try {
    const data = JSON.parse(settings.data);
    return NextResponse.json({ ...DEFAULTS, ...data });
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const existing = await prisma.settings.findUnique({ where: { id: "singleton" } });
  let current: Record<string, unknown> = {};
  if (existing) {
    try {
      current = JSON.parse(existing.data);
    } catch {
      current = {};
    }
  }

  const merged = { ...DEFAULTS, ...current, ...body };
  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", data: JSON.stringify(merged) },
    update: { data: JSON.stringify(merged) },
  });

  return NextResponse.json(merged);
}
