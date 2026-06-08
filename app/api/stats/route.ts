import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [total, newToday, applied, replied, sourceGroups, last7Days] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { foundAt: { gte: startOfToday } } }),
    prisma.project.count({ where: { status: "applied" } }),
    prisma.project.count({ where: { status: "replied" } }),
    prisma.project.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.project.findMany({
      where: { foundAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { foundAt: true },
    }),
  ]);

  const sources: Record<string, number> = {};
  for (const group of sourceGroups) sources[group.source] = group._count._all;

  const dayBuckets: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = 0;
  }
  for (const project of last7Days) {
    const key = project.foundAt.toISOString().slice(0, 10);
    if (key in dayBuckets) dayBuckets[key]++;
  }
  const perDay = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }));

  return NextResponse.json({ total, newToday, applied, replied, sources, perDay });
}
