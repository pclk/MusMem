import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { generatePage } from "@/lib/algorithm/page-generator";
import { WeakBigram } from "@/lib/algorithm/scoring";
import englishWords from "@/lib/words/english-5k.json";
import { selectKeymapExercise } from "@/lib/keymaps/select-exercise";
import { PracticeMode } from "@/lib/schemas/mode";
import {
  DEFAULT_BIGRAM_WINDOW_SIZE,
  materializeBigramStats,
} from "@/lib/bigram-insights";

export const dynamic = "force-dynamic";

function parseIntegerParam(value: string | null, min: number, max: number) {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function parseModeParam(value: string | null): PracticeMode | undefined | null {
  if (value === null) {
    return undefined;
  }

  if (value === "TEXT" || value === "KEYMAP") {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const modeOverride = parseModeParam(url.searchParams.get("mode"));
    const charsPerPageOverride = parseIntegerParam(url.searchParams.get("charsPerPage"), 50, 500);
    const targetedPracticeRatioOverride = parseIntegerParam(url.searchParams.get("targetedPracticeRatio"), 0, 100);
    const bigramWindowSizeOverride = parseIntegerParam(url.searchParams.get("bigramWindowSize"), 5, 100);
    const activeListIdOverride = url.searchParams.get("activeListId");

    if (
      modeOverride === null ||
      charsPerPageOverride === null ||
      targetedPracticeRatioOverride === null ||
      bigramWindowSizeOverride === null
    ) {
      return NextResponse.json({ error: "Invalid page override parameters" }, { status: 400 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
      include: { activeList: true },
    });

    const mode = modeOverride ?? settings?.mode ?? "TEXT";
    const bigramWindowSize =
      bigramWindowSizeOverride ?? settings?.bigramWindowSize ?? DEFAULT_BIGRAM_WINDOW_SIZE;

    if (mode === "KEYMAP") {
      const lastSeen = await prisma.keymapCommandStat.findFirst({
        where: { userId: session.userId },
        orderBy: { lastSeen: "desc" },
        select: { exerciseId: true },
      });
      const exercise = selectKeymapExercise(lastSeen?.exerciseId);

      return NextResponse.json({
        mode,
        exercise,
        text: exercise.prompt,
      });
    }

    const charsPerPage = charsPerPageOverride ?? settings?.charsPerPage ?? 200;
    const targetedPracticeRatio = targetedPracticeRatioOverride ?? settings?.targetedPracticeRatio ?? 60;

    let words: string[];
    if (activeListIdOverride) {
      const activeList = await prisma.wordList.findFirst({
        where: { id: activeListIdOverride, userId: session.userId },
        select: { words: true },
      });

      if (!activeList) {
        return NextResponse.json({ error: "Word list not found" }, { status: 404 });
      }

      words = activeList.words;
    } else if (activeListIdOverride === "") {
      words = englishWords as string[];
    } else if (settings?.activeList) {
      words = settings.activeList.words;
    } else {
      words = englishWords as string[];
    }

    const bigramStats = await prisma.bigramStat.findMany({
      where: {
        userId: session.userId,
      },
      select: {
        bigram: true,
        totalAttempts: true,
        totalErrors: true,
        recentResults: true,
        lastSeen: true,
      },
    });

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weakBigrams: WeakBigram[] = materializeBigramStats(
      bigramStats,
      bigramWindowSize
    )
      .filter((stat) => stat.errorRate > 0)
      .slice(0, 20)
      .map((stat) => {
        const lastSeen =
          stat.lastSeen instanceof Date
            ? stat.lastSeen.getTime()
            : new Date(stat.lastSeen ?? Date.now()).getTime();
        const hoursSinceLastSeen = (now - lastSeen) / dayMs;
        const decayBoost = hoursSinceLastSeen > 1 ? (0.2 * Math.min(hoursSinceLastSeen, 7)) / 7 : 0;
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

    return NextResponse.json({ mode, text: pageText });
  } catch (error) {
    console.error("Page generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
