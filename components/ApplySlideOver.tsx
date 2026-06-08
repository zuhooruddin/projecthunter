"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toaster";
import type { ProjectDTO } from "@/lib/types";
import type { TemplateStyle } from "@/lib/coverLetterGenerator";

const STYLES: TemplateStyle[] = ["Professional", "Casual", "Technical", "Startup", "Agency"];

interface ApplySlideOverProps {
  project: ProjectDTO | null;
  onClose: () => void;
  onApplied: (project: ProjectDTO) => void;
}

export default function ApplySlideOver({ project, onClose, onApplied }: ApplySlideOverProps) {
  const [style, setStyle] = useState<TemplateStyle>("Professional");
  const [letter, setLetter] = useState("");
  const [method, setMethod] = useState<"email" | "form" | "manual">("manual");
  const [emailTo, setEmailTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (!project) return;
    setEmailTo(project.contactEmail ?? "");
    setMethod(project.contactEmail ? "email" : "manual");
    generate(style);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  async function generate(nextStyle: TemplateStyle) {
    if (!project) return;
    setStyle(nextStyle);
    setGenerating(true);
    try {
      const res = await fetch("/api/settings");
      const settings = await res.json();
      const profile = settings.profile ?? {};
      const templates = settings.templates ?? {};

      const fillable = templates[nextStyle] ?? "";
      const text = fillable
        .replaceAll("{company}", project.company || "your company")
        .replaceAll("{role}", project.title || "this role")
        .replaceAll("{techStack}", project.techStack.length ? project.techStack.join(", ") : "modern web technologies")
        .replaceAll("{mySkills}", (profile.skills ?? []).join(", "))
        .replaceAll("{name}", profile.name ?? "")
        .replaceAll("{portfolioUrl}", profile.portfolioUrl ?? "")
        .replaceAll("{years}", String(profile.yearsExperience ?? 0))
        .replaceAll("{rateClause}", profile.hourlyRate ? ` | Rate: $${profile.hourlyRate}/hr` : "");

      setLetter(text);
    } catch {
      push("Couldn't load templates/profile from Settings", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    if (!project) return;
    setLoading(true);
    try {
      if (method === "email") {
        if (!emailTo) {
          push("Enter a recipient email address", "error");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: emailTo,
            subject: `Application: ${project.title}`,
            body: letter,
            projectId: project.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to send email");
        push("Application email sent", "success");
      } else {
        const res = await fetch(`/api/projects/${project.id}/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverLetter: letter, method }),
        });
        if (!res.ok) throw new Error("Failed to record application");
        push("Application recorded", "success");
      }
      onApplied({ ...project, status: "applied", isApplied: true, appliedAt: new Date().toISOString() });
      onClose();
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to apply", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-medium truncate">{project.title}</h2>
            <p className="text-sm text-zinc-500 truncate">{project.company ?? "Unknown company"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Cover letter style</label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => generate(s)}
                  className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                    style === s
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-zinc-700 text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">
              Cover letter {generating && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
            </label>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={14}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Application method</label>
            <div className="flex gap-1.5">
              {(["email", "form", "manual"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-lg px-3 py-1.5 text-sm border capitalize transition-colors ${
                    method === m
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-zinc-700 text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {method === "email" && (
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Recipient email</label>
              <input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="hiring@company.com"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-600 mt-1">Sent via your Gmail SMTP configured in Settings.</p>
            </div>
          )}

          {(method === "form" || method === "manual") && (
            <a
              href={project.contactUrl ?? project.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-400 hover:underline"
            >
              Open listing / application page →
            </a>
          )}
        </div>

        <div className="border-t border-zinc-800 px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {method === "email" ? "Send & record" : "Record application"}
          </button>
        </div>
      </div>
    </div>
  );
}
