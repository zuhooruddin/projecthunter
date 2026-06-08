"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import ContactTable from "@/components/ContactTable";
import { useToast } from "@/components/Toaster";
import type { ContactDTO } from "@/lib/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [extractUrl, setExtractUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [emailTarget, setEmailTarget] = useState<ContactDTO | null>(null);
  const { push } = useToast();

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (status) params.set("status", status);
    const res = await fetch(`/api/contacts?${params.toString()}`);
    const data = await res.json();
    setContacts(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, status]);

  const countries = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.country).filter(Boolean))) as string[],
    [contacts]
  );

  async function extract() {
    if (!extractUrl.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/contacts/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: extractUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        push(data.error ?? "Extraction failed", "error");
      } else {
        push(`Extracted contact for ${data.contact.website}`, "success");
        setExtractUrl("");
        load();
      }
    } catch {
      push("Extraction failed", "error");
    } finally {
      setExtracting(false);
    }
  }

  function exportCsv() {
    const header = ["Company", "Website", "Email", "Phone", "LinkedIn", "Country", "Source", "Status"];
    const rows = contacts.map((c) => [
      c.company ?? "", c.website, c.email ?? "", c.phone ?? "", c.linkedIn ?? "", c.country ?? "", c.source ?? "", c.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-zinc-500 mt-1">{contacts.length} contacts extracted</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={contacts.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export to CSV
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col sm:flex-row gap-2">
        <input
          value={extractUrl}
          onChange={(e) => setExtractUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && extract()}
          placeholder="https://company-website.com — extract contact info"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={extract}
          disabled={extracting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {extracting && <Loader2 className="h-4 w-4 animate-spin" />}
          Extract
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Country: All</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Status: All</option>
          {["new", "contacted", "replied", "ignored"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500 py-12 text-center">Loading contacts…</p>
      ) : (
        <ContactTable contacts={contacts} onSendEmail={setEmailTarget} />
      )}

      {emailTarget && <EmailModal contact={emailTarget} onClose={() => setEmailTarget(null)} />}
    </div>
  );
}

function EmailModal({ contact, onClose }: { contact: ContactDTO; onClose: () => void }) {
  const [subject, setSubject] = useState(`Regarding ${contact.company ?? contact.website}`);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function send() {
    if (!contact.email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: contact.email, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      push("Email sent", "success");
      onClose();
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to send email", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Send email to {contact.email}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Message body…"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900">
            Cancel
          </button>
          <button
            onClick={send}
            disabled={loading || !body.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
