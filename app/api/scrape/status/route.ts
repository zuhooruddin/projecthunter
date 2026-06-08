import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = await prisma.scrapeLog.findMany({
    orderBy: { ranAt: "desc" },
    take: 200,
  });

  const bySource: Record<string, { lastRun: string; found: number; newItems: number; error: string | null }> = {};
  for (const log of logs) {
    if (!bySource[log.source]) {
      bySource[log.source] = {
        lastRun: log.ranAt.toISOString(),
        found: log.found,
        newItems: log.newItems,
        error: log.error,
      };
    }
  }

  const lastRun = logs[0]?.ranAt.toISOString() ?? null;

  return NextResponse.json({ lastRun, sources: bySource });
}
