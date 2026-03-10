"use client";

import { useMemo } from "react";
import {
  BigramStatRow,
  formatBigramLabel,
} from "@/lib/bigram-insights";

interface BigramInsightsProps {
  stats: BigramStatRow[];
  isLoading: boolean;
  isResetting: boolean;
  mode: "TEXT" | "KEYMAP";
  onReset: () => void;
}

function getRadarStyle(errorRate: number) {
  const clamped = Math.max(0, Math.min(1, errorRate));
  const hue = (1 - clamped) * 120;

  return {
    backgroundColor: `hsl(${hue} 78% 58%)`,
  };
}

function LoadingSkeleton() {
  return (
    <div className="flex h-12 items-center gap-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 px-2">
      {Array.from({ length: 18 }).map((_, index) => (
        <div
          key={index}
          className="h-7 flex-1 animate-pulse rounded-md bg-white/10"
        />
      ))}
    </div>
  );
}

export default function BigramInsights({
  stats,
  isLoading,
  isResetting,
  mode,
  onReset,
}: BigramInsightsProps) {
  const qualified = useMemo(
    () =>
      [...stats]
        .filter((stat) => stat.totalAttempts > 0 && stat.errorRate > 0)
        .sort((a, b) => {
          if (b.errorRate !== a.errorRate) {
            return b.errorRate - a.errorRate;
          }

          if (b.totalAttempts !== a.totalAttempts) {
            return b.totalAttempts - a.totalAttempts;
          }

          return a.bigram.localeCompare(b.bigram);
        }),
    [stats]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          disabled={isResetting || isLoading}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400 transition-colors hover:border-rose-500/40 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResetting ? "Resetting" : "Reset"}
        </button>
      </div>
      {isLoading ? (
        <LoadingSkeleton />
      ) : qualified.length === 0 ? (
        <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/70 px-3 text-xs text-zinc-500">
          {mode === "KEYMAP" ? "Switch to text typing for radar" : "No bigram errors recorded yet"}
        </div>
      ) : (
        <div
          style={{ scrollbarWidth: "thin", scrollbarColor: "#71717a #18181b" }}
          className="flex h-12 items-center gap-1 overflow-x-auto pr-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-500 [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb:hover]:bg-zinc-400"
        >
          {qualified.map((entry) => (
            <div
              key={entry.bigram}
              title={`${formatBigramLabel(entry.bigram)} • ${(entry.errorRate * 100).toFixed(0)}% error • ${entry.totalAttempts} attempts`}
              style={getRadarStyle(entry.errorRate)}
              className="flex h-8 min-w-8 flex-1 items-center justify-center rounded-md px-2 text-[10px] font-medium tracking-[0.14em] text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
            >
              <span className="font-mono">{formatBigramLabel(entry.bigram)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
