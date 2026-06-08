import { NextRequest, NextResponse } from "next/server";
import { extractContact } from "@/lib/scrapers/contactExtractor";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = body?.url as string | undefined;
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const result = await extractContact(url);
  if (!result) {
    return NextResponse.json({ error: "Could not fetch or parse the website" }, { status: 422 });
  }

  if (!result.allowed) {
    return NextResponse.json({ error: "Excluded by geo filter", country: result.country }, { status: 200 });
  }

  const contact = await prisma.contact.upsert({
    where: { website: result.website },
    create: {
      website: result.website,
      company: result.company,
      email: result.email,
      phone: result.phone,
      linkedIn: result.linkedIn,
      country: result.country,
      source: "manual-extract",
    },
    update: {
      company: result.company ?? undefined,
      email: result.email ?? undefined,
      phone: result.phone ?? undefined,
      linkedIn: result.linkedIn ?? undefined,
      country: result.country ?? undefined,
    },
  });

  return NextResponse.json({ contact, extracted: result });
}
