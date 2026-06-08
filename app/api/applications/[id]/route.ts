import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.notes === "string") data.notes = body.notes;
  if (body.replyAt === null || typeof body.replyAt === "string") {
    data.replyAt = body.replyAt ? new Date(body.replyAt) : null;
  }
  if (body.markReplied === true) {
    data.status = "replied";
    data.replyAt = new Date();
  }

  const application = await prisma.application.update({ where: { id: params.id }, data });
  return NextResponse.json(application);
}
