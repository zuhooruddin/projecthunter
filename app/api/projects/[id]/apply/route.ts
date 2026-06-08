import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { coverLetter, method, notes } = body as { coverLetter?: string; method?: string; notes?: string };

  if (!coverLetter || !method) {
    return NextResponse.json({ error: "coverLetter and method are required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const application = await prisma.application.create({
    data: {
      projectId: params.id,
      coverLetter,
      method,
      notes: notes ?? null,
    },
  });

  await prisma.project.update({
    where: { id: params.id },
    data: { status: "applied", isApplied: true, appliedAt: new Date() },
  });

  return NextResponse.json(application, { status: 201 });
}
