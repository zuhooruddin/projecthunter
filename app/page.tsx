"use client";

import { useEffect, useState } from "react";
import { Briefcase, CalendarPlus, Send, MessageSquare, Play, Loader2 } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import ProgressBar from "@/components/ProgressBar";
import { useToast } from "@/components/Toaster";
import { timeAgo, countryFlag } from "@/lib/utils";
import type { ProjectDTO } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Stats {
  total: number;
  newToday: number;
  applied: number;
  replied: number;
  sources: Record<string, number>;
  perDay: { date: string; count: number }[];
}

interface ScrapeStatus {
  lastRun: string | null;
  sources: Record<string, { lastRun: string; found: number; newItems: number; error: string | null }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [recent, setRecent] = useState<ProjectDTO[]>([]);
  const [scraping, setScraping] = useState(false);
  const { push } = useToast();

  async function loadAll() {
    const [statsRes, statusRes, projectsRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/scrape/status"),
      fetch("/api/projects?pageSize=20&sort=newest"),
    ]);
    setStats(await statsRes.json());
    setStatus(await statusRes.json());
    const projectsData = await projectsRes.json();
    setRecent(projectsData.items ?? []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function runScrape() {
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scrape failed");
      push(`Scrape complete — ${data.totalNew} new project${data.totalNew === 1 ? "" : "s"} found`, "success");
      await loadAll();
    } catch (err) {
      push(err instanceof Error ? err.message : "Scrape failed", "error");
    } finally {
      setScraping(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Track new dev projects from free sources</p>
        </div>
        <button
          onClick={runScrape}
          disabled={scraping}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {scraping ? "Scraping…" : "Run Scraper Now"}
        </button>
      </div>

      {scraping && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-sm text-zinc-400 mb-2">Scraping all enabled sources — this can take a minute…</p>
          <ProgressBar progress={66} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Projects" value={stats?.total ?? "—"} icon={Briefcase} accent="text-blue-400" />
        <StatsCard label="New Today" value={stats?.newToday ?? "—"} icon={CalendarPlus} accent="text-green-400" />
        <StatsCard label="Applied" value={stats?.applied ?? "—"} icon={Send} accent="text-orange-400" />
        <StatsCard label="Replies Received" value={stats?.replied ?? "—"} icon={MessageSquare} accent="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="font-medium mb-4">Projects found — last 7 days</h2>
          {stats && (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.perDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="font-medium mb-4">Last scraped per source</h2>
          <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
            {status && Object.entries(status.sources).length === 0 && (
              <p className="text-sm text-zinc-500">No scrapes yet — run the scraper to get started.</p>
            )}
            {status &&
              Object.entries(status.sources).map(([source, info]) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 truncate">{source}</span>
                  <span className="text-zinc-500 text-xs shrink-0 ml-2">
                    {info.error ? <span className="text-red-400">error</span> : `+${info.newItems} · ${timeAgo(info.lastRun)}`}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-4">Recent projects</h2>
        <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
          {recent.length === 0 && <p className="text-sm text-zinc-500 p-6 text-center">No projects yet — run the scraper.</p>}
          {recent.map((project) => (
            <a
              key={project.id}
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-900/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm text-zinc-200 truncate">{project.title}</div>
                <div className="text-xs text-zinc-500 truncate">
                  {project.company ?? "Unknown"} · {countryFlag(project.country)} {project.country ?? "Unknown"} · {project.source}
                </div>
              </div>
              <span className="text-xs text-zinc-600 shrink-0">{timeAgo(project.foundAt)}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
