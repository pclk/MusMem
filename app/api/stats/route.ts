import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  DEFAULT_BIGRAM_WINDOW_SIZE,
  materializeBigramStats,
} from "@/lib/bigram-insights";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [settings, sessions, rawBigrams, keymapStats, totals] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId: session.userId },
        select: { bigramWindowSize: true },
      }),
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
        where: { userId: session.userId },
        select: {
          bigram: true,
          totalAttempts: true,
          totalErrors: true,
          recentResults: true,
        },
      }),
      prisma.keymapCommandStat.findMany({
        where: { userId: session.userId },
        orderBy: { lastSeen: "desc" },
        take: 20,
        select: {
          exerciseId: true,
          prompt: true,
          attempts: true,
          errors: true,
          avgLatencyMs: true,
        },
      }),
      prisma.typingSession.aggregate({
        where: { userId: session.userId },
        _sum: { charsTyped: true, pagesCompleted: true },
      }),
    ]);

    const worstBigrams = materializeBigramStats(
      rawBigrams,
      settings?.bigramWindowSize ?? DEFAULT_BIGRAM_WINDOW_SIZE
    ).slice(0, 10);

    const overallAccuracy = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.accuracy ?? 0), 0) / sessions.filter(s => s.accuracy !== null).length
      : null;

    return NextResponse.json({
      recentSessions: sessions,
      worstBigrams,
      totalCharsTyped: totals._sum.charsTyped ?? 0,
      totalPagesCompleted: totals._sum.pagesCompleted ?? 0,
      overallAccuracy,
      keymapStats: keymapStats.map((row) => ({
        ...row,
        accuracy: row.attempts > 0 ? (row.attempts - row.errors) / row.attempts : 0,
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
