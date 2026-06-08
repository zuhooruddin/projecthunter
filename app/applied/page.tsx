"use client";

import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/components/Toaster";
import type { ApplicationDTO } from "@/lib/types";

const PIPELINE = ["sent", "replied", "interview", "hired", "rejected"];

const PIPELINE_COLORS: Record<string, string> = {
  sent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  replied: "bg-green-500/15 text-green-400 border-green-500/30",
  interview: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  hired: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export default function AppliedPage() {
  const [applications, setApplications] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { push } = useToast();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/applications");
    const data = await res.json();
    setApplications(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(app: ApplicationDTO, status: string) {
    setSavingId(app.id);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status === "replied" ? { markReplied: true } : { status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, ...updated } : a)));
    } catch {
      push("Couldn't update application status", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function updateNotes(app: ApplicationDTO, notes: string) {
    try {
      await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    } catch {
      push("Couldn't save notes", "error");
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Applied</h1>
        <p className="text-sm text-zinc-500 mt-1">{applications.length} applications tracked</p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500 py-12 text-center">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-zinc-500 py-12 text-center">No applications yet — apply to a project to track it here.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((app) => (
            <div key={app.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{app.project.title}</h3>
                  <p className="text-sm text-zinc-500 truncate">{app.project.company ?? "Unknown company"} · via {app.method}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${PIPELINE_COLORS[app.status] ?? PIPELINE_COLORS.sent}`}>
                  {app.status}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {PIPELINE.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => updateStatus(app, stage)}
                    disabled={savingId === app.id}
                    className={`rounded-lg px-2.5 py-1 text-xs border capitalize transition-colors disabled:opacity-50 ${
                      app.status === stage
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    {savingId === app.id && app.status !== stage ? <Loader2 className="inline h-3 w-3 animate-spin" /> : stage === app.status ? <Check className="inline h-3 w-3 mr-1" /> : null}
                    {stage}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-zinc-400">
                <div>
                  <div className="text-xs text-zinc-600">Sent</div>
                  {new Date(app.sentAt).toLocaleDateString()}
                </div>
                <div>
                  <div className="text-xs text-zinc-600">Days since applied</div>
                  {daysSince(app.sentAt)}
                </div>
                <div>
                  <div className="text-xs text-zinc-600">Replied</div>
                  {app.replyAt ? new Date(app.replyAt).toLocaleDateString() : "—"}
                </div>
                <div>
                  <div className="text-xs text-zinc-600">Source</div>
                  {app.project.source}
                </div>
              </div>

              <textarea
                defaultValue={app.notes ?? ""}
                onBlur={(e) => updateNotes(app, e.target.value)}
                placeholder="Notes…"
                rows={2}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
