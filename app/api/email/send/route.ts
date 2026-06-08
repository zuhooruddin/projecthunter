import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailSender";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, subject, body: message, projectId } = body as {
    to?: string;
    subject?: string;
    body?: string;
    projectId?: string;
  };

  if (!to || !subject || !message) {
    return NextResponse.json({ error: "to, subject and body are required" }, { status: 400 });
  }

  try {
    await sendEmail({ to, subject, body: message });

    if (projectId) {
      await prisma.application.create({
        data: { projectId, coverLetter: message, method: "email", status: "sent" },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "applied", isApplied: true, appliedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
