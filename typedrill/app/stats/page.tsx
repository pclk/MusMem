import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import prisma from "@/lib/db";
import Link from "next/link";
import Card from "@/components/ui/Card";
import WpmChart from "./components/WpmChart";
import BigramTable from "./components/BigramTable";

export default async function StatsPage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  const [sessions, worstBigrams, totals] = await Promise.all([
    prisma.typingSession.findMany({
      where: { userId: session.userId },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        startedAt: true,
        pagesCompleted: true,
        charsTyped: true,
        accuracy: true,
        wpm: true,
      },
    }),
    prisma.bigramStat.findMany({
      where: {
        userId: session.userId,
        totalAttempts: { gte: 5 },
      },
      orderBy: { errorRate: "desc" },
      take: 10,
      select: {
        bigram: true,
        errorRate: true,
        totalAttempts: true,
        totalErrors: true,
      },
    }),
    prisma.typingSession.aggregate({
      where: { userId: session.userId },
      _sum: { charsTyped: true, pagesCompleted: true },
    }),
  ]);

  const sessionsWithAccuracy = sessions.filter((s) => s.accuracy !== null);
  const overallAccuracy =
    sessionsWithAccuracy.length > 0
      ? sessionsWithAccuracy.reduce((sum, s) => sum + (s.accuracy ?? 0), 0) /
        sessionsWithAccuracy.length
      : null;

  const serializedSessions = sessions.map((s) => ({
    ...s,
    startedAt: s.startedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold">
          Mus<span className="text-emerald-400">Mem</span>
        </h1>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/type" className="hover:text-zinc-200 transition-colors">
            Type
          </Link>
          <Link href="/stats" className="text-emerald-400">
            Stats
          </Link>
          <Link
            href="/settings"
            className="hover:text-zinc-200 transition-colors"
          >
            Settings
          </Link>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        <h2 className="text-2xl font-bold">Your Stats</h2>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">
              Total Chars
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {(totals._sum.charsTyped ?? 0).toLocaleString()}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">
              Pages
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {totals._sum.pagesCompleted ?? 0}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">
              Avg Accuracy
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {overallAccuracy !== null
                ? `${overallAccuracy.toFixed(1)}%`
                : "—"}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">
              Sessions
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {sessions.length}
            </p>
          </Card>
        </div>

        {/* WPM Chart */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">WPM Trend</h3>
          <WpmChart sessions={serializedSessions} />
        </Card>

        {/* Worst Bigrams */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">
            Top 10 Weakest Bigrams
          </h3>
          <BigramTable bigrams={worstBigrams} />
        </Card>
      </main>
    </div>
  );
}
