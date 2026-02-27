"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Session {
  id: string;
  startedAt: string;
  wpm: number | null;
  accuracy: number | null;
}

interface WpmChartProps {
  sessions: Session[];
}

export default function WpmChart({ sessions }: WpmChartProps) {
  const data = [...sessions]
    .reverse()
    .filter((s) => s.wpm !== null)
    .map((s, i) => ({
      index: i + 1,
      wpm: Math.round(s.wpm!),
      accuracy: s.accuracy ? Math.round(s.accuracy * 10) / 10 : null,
      date: new Date(s.startedAt).toLocaleDateString(),
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        No session data yet. Start typing to see your progress.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="index"
          stroke="#52525b"
          tick={{ fill: "#71717a", fontSize: 12 }}
          label={{ value: "Session", position: "insideBottom", offset: -5, fill: "#71717a" }}
        />
        <YAxis
          stroke="#52525b"
          tick={{ fill: "#71717a", fontSize: 12 }}
          label={{ value: "WPM", angle: -90, position: "insideLeft", fill: "#71717a" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={(label) => `Session ${label}`}
        />
        <Line
          type="monotone"
          dataKey="wpm"
          stroke="#34d399"
          strokeWidth={2}
          dot={{ fill: "#34d399", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
