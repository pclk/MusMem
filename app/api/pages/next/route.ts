import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { generatePage } from "@/lib/algorithm/page-generator";
import { WeakBigram } from "@/lib/algorithm/scoring";
import englishWords from "@/lib/words/english-5k.json";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
      include: { activeList: true },
    });

    const charsPerPage = settings?.charsPerPage ?? 200;
    const targetedPracticeRatio = settings?.targetedPracticeRatio ?? 60;

    // Get word list
    let words: string[];
    if (settings?.activeList) {
      words = settings.activeList.words;
    } else {
      words = englishWords as string[];
    }

    // Fetch top 20 worst bigrams (min 5 attempts)
    const bigramStats = await prisma.bigramStat.findMany({
      where: {
        userId: session.userId,
        totalAttempts: { gte: 5 },
      },
      orderBy: { errorRate: "desc" },
      take: 20,
    });

    // Apply decay: bigrams not seen in 24h get a 20% boost to effective error rate
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weakBigrams: WeakBigram[] = bigramStats.map((stat) => {
      const hoursSinceLastSeen = (now - stat.lastSeen.getTime()) / dayMs;
      const decayBoost = hoursSinceLastSeen > 1 ? 0.2 * Math.min(hoursSinceLastSeen, 7) / 7 : 0;
      return {
        bigram: stat.bigram,
        errorRate: Math.min(stat.errorRate + decayBoost, 1),
      };
    });

    const pageText = generatePage({
      words,
      weakBigrams,
      charsPerPage,
      targetedPracticeRatio,
    });

    return NextResponse.json({ text: pageText });
  } catch (error) {
    console.error("Page generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
