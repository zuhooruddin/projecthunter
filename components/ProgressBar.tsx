import { cn } from "@/lib/utils";

export default function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-zinc-800", className)}>
      <div
        className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
