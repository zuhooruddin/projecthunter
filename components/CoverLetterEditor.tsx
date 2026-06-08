"use client";

import { useState } from "react";
import type { TemplateStyle } from "@/lib/coverLetterGenerator";

const STYLES: TemplateStyle[] = ["Professional", "Casual", "Technical", "Startup", "Agency"];
const PLACEHOLDERS = "{company} {role} {techStack} {mySkills} {name} {portfolioUrl} {years} {rateClause}";

interface CoverLetterEditorProps {
  templates: Record<string, string>;
  onChange: (style: TemplateStyle, value: string) => void;
}

export default function CoverLetterEditor({ templates, onChange }: CoverLetterEditorProps) {
  const [active, setActive] = useState<TemplateStyle>("Professional");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {STYLES.map((style) => (
          <button
            key={style}
            onClick={() => setActive(style)}
            className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
              active === style
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-zinc-700 text-zinc-400 hover:bg-zinc-900"
            }`}
          >
            {style}
          </button>
        ))}
      </div>
      <textarea
        value={templates[active] ?? ""}
        onChange={(e) => onChange(active, e.target.value)}
        rows={12}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
      />
      <p className="text-xs text-zinc-600">Available variables: {PLACEHOLDERS}</p>
    </div>
  );
}
