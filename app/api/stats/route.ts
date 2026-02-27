import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessions = await prisma.typingSession.findMany({
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
    });

    const worstBigrams = await prisma.bigramStat.findMany({
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
    });


    const keymapStats = await prisma.keymapCommandStat.findMany({
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
    });

    const totals = await prisma.typingSession.aggregate({
      where: { userId: session.userId },
      _sum: { charsTyped: true, pagesCompleted: true },
    });

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
