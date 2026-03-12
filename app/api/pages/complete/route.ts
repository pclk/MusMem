import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { pageCompleteSchema } from "@/lib/schemas/page";
import {
  extractBigramResults,
  aggregateBigramResults,
  groupBigramResults,
} from "@/lib/algorithm/bigram";
import { calculateWpm, calculateAccuracy } from "@/lib/utils";
import {
  appendRecentBigramResults,
  calculateRollingErrorRate,
  DEFAULT_BIGRAM_WINDOW_SIZE,
  MAX_BIGRAM_WINDOW_SIZE,
} from "@/lib/bigram-insights";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = pageCompleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const correctChars = payload.keystrokeTimings.filter((k) => k.correct).length;
    const accuracyAttemptCount = payload.keystrokeTimings.length;
    const scoredChars =
      payload.mode === "TEXT" ? payload.targetText.length : payload.keystrokeTimings.length;
    const accuracy = calculateAccuracy(correctChars, accuracyAttemptCount);
    const kpm = null;

    let wpm: number | null = null;
    if (payload.mode === "TEXT" && payload.keystrokeTimings.length >= 2) {
      const duration =
        payload.keystrokeTimings[payload.keystrokeTimings.length - 1].timestamp -
        payload.keystrokeTimings[0].timestamp;
      wpm = calculateWpm(scoredChars, duration);
    }

    if (payload.mode === "TEXT") {
      const bigramResults = extractBigramResults(payload.targetText, payload.typedText);
      const aggregated = aggregateBigramResults(bigramResults);
      const grouped = groupBigramResults(bigramResults);
      const updatedBigrams = Array.from(aggregated.keys());
      const [settings, existingStats] = await Promise.all([
        prisma.userSettings.findUnique({
          where: { userId: session.userId },
          select: { bigramWindowSize: true },
        }),
        prisma.bigramStat.findMany({
          where: { userId: session.userId, bigram: { in: updatedBigrams } },
          select: {
            id: true,
            bigram: true,
            totalAttempts: true,
            totalErrors: true,
            recentResults: true,
          },
        }),
      ]);
      const existingMap = new Map(existingStats.map((stat) => [stat.bigram, stat]));
      const bigramWindowSize =
        settings?.bigramWindowSize ?? DEFAULT_BIGRAM_WINDOW_SIZE;

      await Promise.all(
        Array.from(aggregated.entries()).map(([bigram, { attempts, errors }]) => {
          const existing = existingMap.get(bigram);
          const nextRecentResults = appendRecentBigramResults(
            existing?.recentResults,
            grouped.get(bigram) ?? [],
            existing?.totalAttempts ?? 0,
            existing?.totalErrors ?? 0,
            MAX_BIGRAM_WINDOW_SIZE
          );
          const nextTotalAttempts = (existing?.totalAttempts ?? 0) + attempts;
          const nextTotalErrors = (existing?.totalErrors ?? 0) + errors;
          const nextErrorRate = calculateRollingErrorRate(
            nextRecentResults,
            bigramWindowSize,
            nextTotalAttempts,
            nextTotalErrors
          );

          return prisma.bigramStat.upsert({
            where: { userId_bigram: { userId: session.userId!, bigram } },
            create: {
              userId: session.userId!,
              bigram,
              totalAttempts: attempts,
              totalErrors: errors,
              errorRate: nextErrorRate,
              recentResults: nextRecentResults,
              lastSeen: new Date(),
            },
            update: {
              totalAttempts: { increment: attempts },
              totalErrors: { increment: errors },
              errorRate: nextErrorRate,
              recentResults: nextRecentResults,
              lastSeen: new Date(),
            },
          });
        })
      );
    } else {
      const attemptLatency = payload.correct ? payload.latencyMs : 0;
      await prisma.keymapCommandStat.upsert({
        where: {
          userId_exerciseId: {
            userId: session.userId,
            exerciseId: payload.exerciseId,
          },
        },
        create: {
          userId: session.userId,
          exerciseId: payload.exerciseId,
          prompt: payload.prompt,
          attempts: 1,
          errors: payload.correct ? 0 : 1,
          totalLatencyMs: attemptLatency,
          avgLatencyMs: payload.correct ? payload.latencyMs : null,
          lastSeen: new Date(),
        },
        update: {
          prompt: payload.prompt,
          attempts: { increment: 1 },
          errors: { increment: payload.correct ? 0 : 1 },
          totalLatencyMs: { increment: attemptLatency },
          lastSeen: new Date(),
        },
      });

      const updated = await prisma.keymapCommandStat.findUnique({
        where: {
          userId_exerciseId: {
            userId: session.userId,
            exerciseId: payload.exerciseId,
          },
        },
      });

      if (updated) {
        await prisma.keymapCommandStat.update({
          where: { id: updated.id },
          data: {
            avgLatencyMs: updated.attempts > updated.errors ? updated.totalLatencyMs / (updated.attempts - updated.errors) : null,
          },
        });
      }
    }

    let typingSession = await prisma.typingSession.findFirst({
      where: { userId: session.userId, completedAt: null },
      orderBy: { startedAt: "desc" },
    });

    if (!typingSession) {
      typingSession = await prisma.typingSession.create({
        data: {
          userId: session.userId,
          pagesCompleted: 1,
          charsTyped: scoredChars,
          accuracy,
          wpm,
        },
      });
    } else {
      const newPagesCompleted = typingSession.pagesCompleted + 1;
      const newCharsTyped = typingSession.charsTyped + scoredChars;
      const newAccuracy = typingSession.accuracy
        ? (typingSession.accuracy * typingSession.pagesCompleted + accuracy) / newPagesCompleted
        : accuracy;
      const newWpm =
        wpm === null
          ? typingSession.wpm
          : typingSession.wpm !== null
            ? (typingSession.wpm * typingSession.pagesCompleted + wpm) / newPagesCompleted
            : wpm;

      typingSession = await prisma.typingSession.update({
        where: { id: typingSession.id },
        data: {
          pagesCompleted: newPagesCompleted,
          charsTyped: newCharsTyped,
          accuracy: newAccuracy,
          wpm: newWpm,
        },
      });
    }

    return NextResponse.json({
      mode: payload.mode,
      accuracy,
      wpm,
      kpm,
      pagesCompleted: typingSession.pagesCompleted,
      charsTyped: typingSession.charsTyped,
      ...(payload.mode === "KEYMAP" && { correct: payload.correct, exerciseId: payload.exerciseId }),
    });
  } catch (error) {
    console.error("Page complete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
