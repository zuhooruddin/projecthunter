"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X, Save, Send } from "lucide-react";
import CoverLetterEditor from "@/components/CoverLetterEditor";
import { useToast } from "@/components/Toaster";
import type { TemplateStyle } from "@/lib/coverLetterGenerator";

interface SettingsData {
  profile: { name: string; skills: string[]; portfolioUrl: string; yearsExperience: number; hourlyRate: number };
  enabledScrapers: Record<string, boolean>;
  scrapeInterval: string;
  excludedKeywords: string[];
  excludedDomains: string[];
  templates: Record<string, string>;
}

const SCRAPER_LABELS: Record<string, string> = {
  rss: "RSS feeds",
  reddit: "Reddit",
  hackernews: "Hacker News",
  devto: "Dev.to",
};

const INTERVALS = ["1h", "3h", "6h", "12h", "24h"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [skillsInput, setSkillsInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [gmailUser, setGmailUser] = useState("");
  const [gmailPass, setGmailPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SettingsData) => {
        setSettings(data);
        setSkillsInput((data.profile?.skills ?? []).join(", "));
      });
  }, []);

  if (!settings) {
    return <div className="p-8 text-sm text-zinc-500">Loading settings…</div>;
  }

  function update<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const profile = {
        ...settings.profile,
        skills: skillsInput.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, profile }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setSettings(updated);
      push("Settings saved", "success");
    } catch {
      push("Couldn't save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  async function testEmail() {
    if (!gmailUser || !gmailPass) {
      push("Enter your Gmail address and app password to test", "error");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: gmailUser,
          subject: "DevProject Hunter — test email",
          body: "This is a test email from DevProject Hunter. Your Gmail SMTP is configured correctly.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send test email");
      push("Test email sent — check your inbox", "success");
    } catch (err) {
      push(err instanceof Error ? err.message : "Test failed. Check GMAIL_USER / GMAIL_APP_PASSWORD in .env", "error");
    } finally {
      setTesting(false);
    }
  }

  function addToList(key: "excludedKeywords" | "excludedDomains", value: string, clear: () => void) {
    if (!value.trim() || !settings) return;
    update(key, [...settings[key], value.trim()]);
    clear();
  }

  function removeFromList(key: "excludedKeywords" | "excludedDomains", index: number) {
    if (!settings) return;
    update(key, settings[key].filter((_, i) => i !== index));
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Configure your profile, scrapers, and outreach</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
      </div>

      <Section title="My Profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name">
            <input
              value={settings.profile.name}
              onChange={(e) => update("profile", { ...settings.profile, name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Portfolio URL">
            <input
              value={settings.profile.portfolioUrl}
              onChange={(e) => update("profile", { ...settings.profile, portfolioUrl: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Years of experience">
            <input
              type="number"
              value={settings.profile.yearsExperience}
              onChange={(e) => update("profile", { ...settings.profile, yearsExperience: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Hourly rate (USD)">
            <input
              type="number"
              value={settings.profile.hourlyRate}
              onChange={(e) => update("profile", { ...settings.profile, hourlyRate: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Skills (comma separated)" full>
            <input
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="React, Node.js, TypeScript, PostgreSQL"
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Email Settings (Gmail SMTP)">
        <p className="text-xs text-zinc-500 -mt-2">
          Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file (free with a Gmail App Password — enable 2FA first).
          Use the fields below only to send a test email with your current credentials.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Gmail address">
            <input value={gmailUser} onChange={(e) => setGmailUser(e.target.value)} placeholder="you@gmail.com" className="input" />
          </Field>
          <Field label="App password">
            <input
              type="password"
              value={gmailPass}
              onChange={(e) => setGmailPass(e.target.value)}
              placeholder="•••• •••• •••• ••••"
              className="input"
            />
          </Field>
        </div>
        <button
          onClick={testEmail}
          disabled={testing}
          className="self-start inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send test email
        </button>
      </Section>

      <Section title="Scraper Settings">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(SCRAPER_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabledScrapers[key] !== false}
                onChange={(e) => update("enabledScrapers", { ...settings.enabledScrapers, [key]: e.target.checked })}
                className="accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
        <Field label="Scrape interval">
          <select
            value={settings.scrapeInterval}
            onChange={(e) => update("scrapeInterval", e.target.value)}
            className="input"
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>Every {i}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Excluded Keywords">
        <TagList
          items={settings.excludedKeywords}
          input={keywordInput}
          onInputChange={setKeywordInput}
          onAdd={() => addToList("excludedKeywords", keywordInput, () => setKeywordInput(""))}
          onRemove={(i) => removeFromList("excludedKeywords", i)}
          placeholder="e.g. intern, unpaid"
        />
      </Section>

      <Section title="Excluded Domains">
        <TagList
          items={settings.excludedDomains}
          input={domainInput}
          onInputChange={setDomainInput}
          onAdd={() => addToList("excludedDomains", domainInput, () => setDomainInput(""))}
          onRemove={(i) => removeFromList("excludedDomains", i)}
          placeholder="e.g. spammycompany.com"
        />
      </Section>

      <Section title="Cover Letter Templates">
        <CoverLetterEditor
          templates={settings.templates}
          onChange={(style: TemplateStyle, value: string) => update("templates", { ...settings.templates, [style]: value })}
        />
      </Section>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #27272a;
          background: #18181b;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #e4e4e7;
        }
        .input:focus {
          outline: none;
          box-shadow: 0 0 0 1px #3b82f6;
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-4">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function TagList({
  items,
  input,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  items: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button onClick={onAdd} className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:bg-zinc-900">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
            {item}
            <button onClick={() => onRemove(i)} className="text-zinc-500 hover:text-zinc-200">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-zinc-600">None added yet</span>}
      </div>
    </div>
  );
}
