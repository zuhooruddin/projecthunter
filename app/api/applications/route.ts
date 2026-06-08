import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const applications = await prisma.application.findMany({
    include: { project: true },
    orderBy: { sentAt: "desc" },
  });

  return NextResponse.json({
    items: applications,
  });
}
