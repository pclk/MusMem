"use client";

interface BigramRow {
  bigram: string;
  errorRate: number;
  totalAttempts: number;
  totalErrors: number;
}

interface BigramTableProps {
  bigrams: BigramRow[];
}

function formatBigram(bigram: string): string {
  return bigram
    .replace(/ /g, "\u2423") // visible space character
    .replace(/\t/g, "\\t");
}

export default function BigramTable({ bigrams }: BigramTableProps) {
  if (bigrams.length === 0) {
    return (
      <div className="text-zinc-500 text-sm text-center py-6">
        No bigram data yet. Complete some typing pages to see your weak spots.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="text-left py-2 px-3 font-medium">Bigram</th>
            <th className="text-right py-2 px-3 font-medium">Error Rate</th>
            <th className="text-right py-2 px-3 font-medium">Attempts</th>
            <th className="text-right py-2 px-3 font-medium">Errors</th>
          </tr>
        </thead>
        <tbody>
          {bigrams.map((b) => (
            <tr
              key={b.bigram}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
            >
              <td className="py-2 px-3">
                <code className="bg-zinc-800 px-2 py-0.5 rounded text-emerald-400 font-mono">
                  {formatBigram(b.bigram)}
                </code>
              </td>
              <td className="text-right py-2 px-3">
                <span
                  className={
                    b.errorRate > 0.3
                      ? "text-red-400"
                      : b.errorRate > 0.15
                        ? "text-yellow-400"
                        : "text-zinc-300"
                  }
                >
                  {(b.errorRate * 100).toFixed(1)}%
                </span>
              </td>
              <td className="text-right py-2 px-3 text-zinc-400">
                {b.totalAttempts}
              </td>
              <td className="text-right py-2 px-3 text-zinc-400">
                {b.totalErrors}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
