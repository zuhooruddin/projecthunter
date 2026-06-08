"use client";

import { useState } from "react";
import { Copy, ExternalLink, Mail, Check } from "lucide-react";
import { countryFlag } from "@/lib/utils";
import { useToast } from "@/components/Toaster";
import type { ContactDTO } from "@/lib/types";

interface ContactTableProps {
  contacts: ContactDTO[];
  onSendEmail: (contact: ContactDTO) => void;
}

export default function ContactTable({ contacts, onSendEmail }: ContactTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { push } = useToast();

  async function copyEmail(contact: ContactDTO) {
    if (!contact.email) return;
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopiedId(contact.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      push("Couldn't copy to clipboard", "error");
    }
  }

  if (contacts.length === 0) {
    return <p className="text-sm text-zinc-500 py-8 text-center">No contacts yet. Extract some from project listings.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Company</th>
            <th className="px-4 py-3 text-left font-medium">Website</th>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">Country</th>
            <th className="px-4 py-3 text-left font-medium">Source</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {contacts.map((contact) => (
            <tr key={contact.id} className="hover:bg-zinc-900/50">
              <td className="px-4 py-3 text-zinc-200">{contact.company ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-400">{contact.website}</td>
              <td className="px-4 py-3 text-zinc-400">{contact.email ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-400">
                {countryFlag(contact.country)} {contact.country ?? "Unknown"}
              </td>
              <td className="px-4 py-3 text-zinc-500">{contact.source ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">{contact.status}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {contact.email && (
                    <button
                      onClick={() => copyEmail(contact)}
                      title="Copy email"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      {copiedId === contact.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                  <a
                    href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Visit site"
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {contact.email && (
                    <button
                      onClick={() => onSendEmail(contact)}
                      title="Send email"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
