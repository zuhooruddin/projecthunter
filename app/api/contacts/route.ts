import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const status = searchParams.get("status");

  const where: Prisma.ContactWhereInput = {};
  if (country) where.country = country;
  if (status) where.status = status;

  const contacts = await prisma.contact.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items: contacts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { website, company, email, phone, linkedIn, country, source } = body as Record<string, string | null>;

  if (!website) return NextResponse.json({ error: "website is required" }, { status: 400 });

  const contact = await prisma.contact.upsert({
    where: { website },
    create: { website, company, email, phone, linkedIn, country, source },
    update: { company, email, phone, linkedIn, country, source },
  });

  return NextResponse.json(contact, { status: 201 });
}
