import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const source = searchParams.get("source");
  const status = searchParams.get("status");
  const role = searchParams.get("role");
  const tech = searchParams.get("tech");
  const search = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? "50"));
  const sort = searchParams.get("sort") ?? "newest";

  const where: Prisma.ProjectWhereInput = {};
  if (country) where.country = country;
  if (source) where.source = source;
  if (status) where.status = status;
  if (role) where.role = role;
  if (tech) where.techStack = { has: tech };
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { company: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const orderBy: Prisma.ProjectOrderByWithRelationInput =
    sort === "oldest" ? { foundAt: "asc" } : sort === "country" ? { country: "asc" } : { foundAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
