"use client";

import { useState } from "react";
import { ExternalLink, Bookmark, BookmarkCheck, Search, Loader2 } from "lucide-react";
import { cn, countryFlag, timeAgo, STATUS_COLORS } from "@/lib/utils";
import { useToast } from "@/components/Toaster";
import type { ProjectDTO } from "@/lib/types";

interface ProjectCardProps {
  project: ProjectDTO;
  onApply: (project: ProjectDTO) => void;
  onChanged: (project: ProjectDTO) => void;
}

export default function ProjectCard({ project, onApply, onChanged }: ProjectCardProps) {
  const [busy, setBusy] = useState<"save" | "extract" | null>(null);
  const { push } = useToast();

  async function toggleSave() {
    setBusy("save");
    const nextStatus = project.status === "saved" ? "new" : "saved";
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      onChanged(updated);
    } catch {
      push("Couldn't update project status", "error");
    } finally {
      setBusy(null);
    }
  }

  async function extractContact() {
    setBusy("extract");
    try {
      const res = await fetch("/api/contacts/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: project.contactUrl ?? project.url }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        push(data.error ?? "No contact info found", "error");
      } else {
        push(`Found contact for ${data.contact.website}`, "success");
      }
    } catch {
      push("Contact extraction failed", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-zinc-100 truncate">{project.title}</h3>
          <div className="text-sm text-zinc-500 truncate">
            {project.company ?? "Unknown company"} · {countryFlag(project.country)} {project.country ?? "Unknown"}
          </div>
          {project.role && (
            <span className="inline-block mt-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs text-purple-300">
              {project.role}
            </span>
          )}
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[project.status] ?? STATUS_COLORS.new)}>
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-zinc-400 line-clamp-2">{project.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{project.source}</span>
        {project.techStack.slice(0, 6).map((tech) => (
          <span key={tech} className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">
            {tech}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-zinc-600">{timeAgo(project.foundAt)}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={extractContact}
            disabled={busy !== null}
            title="Extract contact info"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
          >
            {busy === "extract" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleSave}
            disabled={busy !== null}
            title={project.status === "saved" ? "Unsave" : "Save"}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
          >
            {busy === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : project.status === "saved" ? (
              <BookmarkCheck className="h-4 w-4 text-yellow-400" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            title="Open listing"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={() => onApply(project)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
