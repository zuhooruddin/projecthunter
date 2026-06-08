import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸",
  "United Kingdom": "🇬🇧",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  Germany: "🇩🇪",
  Netherlands: "🇳🇱",
  France: "🇫🇷",
  "United Arab Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦",
};

export function countryFlag(country?: string | null): string {
  if (!country) return "🌐";
  return COUNTRY_FLAGS[country] ?? "🌍";
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value = seconds;
  for (const [size, name] of units) {
    if (value < size) {
      const rounded = Math.floor(value);
      return rounded <= 1 ? `just now` : `${rounded} ${name}${rounded === 1 ? "" : "s"} ago`;
    }
    value /= size;
  }
  return "a while ago";
}

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  saved: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  applied: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  replied: "bg-green-500/15 text-green-400 border-green-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};
