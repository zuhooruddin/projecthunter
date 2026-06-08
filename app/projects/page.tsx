"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import ApplySlideOver from "@/components/ApplySlideOver";
import type { ProjectDTO } from "@/lib/types";

const SOURCES = ["RSS", "Reddit", "HackerNews", "DevTo"];
const STATUSES = ["new", "saved", "applied", "replied", "rejected"];
const ROLES = ["Full Stack Developer", "Web Developer", "Mobile Developer"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [applyTarget, setApplyTarget] = useState<ProjectDTO | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
    if (country) params.set("country", country);
    if (source) params.set("source", source);
    if (status) params.set("status", status);
    if (role) params.set("role", role);

    const res = await fetch(`/api/projects?${params.toString()}`);
    const data = await res.json();
    setProjects(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, country, source, status, role]);

  const fuse = useMemo(
    () => new Fuse(projects, { keys: ["title", "company", "description"], threshold: 0.35 }),
    [projects]
  );

  const visible = useMemo(() => {
    if (!search.trim()) return projects;
    return fuse.search(search).map((r) => r.item);
  }, [search, projects, fuse]);

  const countries = useMemo(
    () => Array.from(new Set(projects.map((p) => p.country).filter(Boolean))) as string[],
    [projects]
  );

  function handleChanged(updated: ProjectDTO) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-zinc-500 mt-1">{total} projects found across all sources</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fuzzy search title, company, description…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Role" value={role} onChange={setRole} options={ROLES} />
          <FilterSelect label="Country" value={country} onChange={setCountry} options={countries} />
          <FilterSelect label="Source" value={source} onChange={setSource} options={SOURCES} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="country">Sort by country</option>
          </select>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : visible.length === 0 ? (
        <p className="text-sm text-zinc-500 py-12 text-center">No projects match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} onApply={setApplyTarget} onChanged={handleChanged} />
          ))}
        </div>
      )}

      {!search && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <ApplySlideOver project={applyTarget} onClose={() => setApplyTarget(null)} onApplied={handleChanged} />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">{label}: All</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 h-44 animate-pulse">
          <div className="h-4 w-2/3 bg-zinc-800 rounded mb-3" />
          <div className="h-3 w-1/2 bg-zinc-800 rounded mb-6" />
          <div className="h-3 w-full bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-5/6 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}
