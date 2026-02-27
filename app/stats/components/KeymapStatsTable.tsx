"use client";

interface KeymapRow {
  exerciseId: string;
  prompt: string;
  attempts: number;
  errors: number;
  avgLatencyMs: number | null;
  accuracy: number;
}

export default function KeymapStatsTable({ rows }: { rows: KeymapRow[] }) {
  if (!rows.length) {
    return <div className="text-zinc-500 text-sm text-center py-6">No keymap data yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="text-left py-2 px-3 font-medium">Prompt</th>
            <th className="text-right py-2 px-3 font-medium">Accuracy</th>
            <th className="text-right py-2 px-3 font-medium">Attempts</th>
            <th className="text-right py-2 px-3 font-medium">Errors</th>
            <th className="text-right py-2 px-3 font-medium">Avg latency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.exerciseId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-2 px-3">{row.prompt}</td>
              <td className="text-right py-2 px-3">{(row.accuracy * 100).toFixed(1)}%</td>
              <td className="text-right py-2 px-3 text-zinc-400">{row.attempts}</td>
              <td className="text-right py-2 px-3 text-zinc-400">{row.errors}</td>
              <td className="text-right py-2 px-3 text-zinc-400">{row.avgLatencyMs ? `${Math.round(row.avgLatencyMs)}ms` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
