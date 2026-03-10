import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  DEFAULT_BIGRAM_WINDOW_SIZE,
  materializeBigramStats,
} from "@/lib/bigram-insights";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const windowSizeParam = url.searchParams.get("bigramWindowSize");
    const windowSize =
      windowSizeParam !== null
        ? Number(windowSizeParam)
        : undefined;

    if (
      windowSize !== undefined &&
      (!Number.isInteger(windowSize) || windowSize < 5 || windowSize > 100)
    ) {
      return NextResponse.json({ error: "Invalid bigram window size" }, { status: 400 });
    }

    const [settings, rawBigrams] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId: session.userId },
        select: { bigramWindowSize: true },
      }),
      prisma.bigramStat.findMany({
        where: { userId: session.userId },
        select: {
          bigram: true,
          totalAttempts: true,
          totalErrors: true,
          recentResults: true,
          lastSeen: true,
        },
      }),
    ]);

    const bigramWindowSize =
      windowSize ?? settings?.bigramWindowSize ?? DEFAULT_BIGRAM_WINDOW_SIZE;
    const bigrams = materializeBigramStats(rawBigrams, bigramWindowSize);

    return NextResponse.json({ bigrams, bigramWindowSize });
  } catch (error) {
    console.error("Bigram stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const deleted = await prisma.bigramStat.deleteMany({
      where: { userId: session.userId },
    });

    return NextResponse.json({ deletedCount: deleted.count });
  } catch (error) {
    console.error("Bigram stats reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
