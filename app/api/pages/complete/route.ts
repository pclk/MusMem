import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { pageCompleteSchema } from "@/lib/schemas/page";
import { extractBigramResults, aggregateBigramResults } from "@/lib/algorithm/bigram";
import { calculateWpm, calculateAccuracy } from "@/lib/utils";

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
    const totalChars =
      payload.mode === "TEXT" ? payload.targetText.length : payload.keystrokeTimings.length;
    const accuracy = calculateAccuracy(correctChars, totalChars);

    let wpm: number | null = null;
    if (payload.keystrokeTimings.length >= 2) {
      const duration =
        payload.keystrokeTimings[payload.keystrokeTimings.length - 1].timestamp -
        payload.keystrokeTimings[0].timestamp;
      wpm = calculateWpm(totalChars, duration);
    }

    if (payload.mode === "TEXT") {
      const bigramResults = extractBigramResults(payload.targetText, payload.typedText);
      const aggregated = aggregateBigramResults(bigramResults);

      const upsertPromises = Array.from(aggregated.entries()).map(([bigram, { attempts, errors }]) =>
        prisma.bigramStat.upsert({
          where: { userId_bigram: { userId: session.userId!, bigram } },
          create: {
            userId: session.userId!,
            bigram,
            totalAttempts: attempts,
            totalErrors: errors,
            errorRate: attempts > 0 ? errors / attempts : 0,
            lastSeen: new Date(),
          },
          update: {
            totalAttempts: { increment: attempts },
            totalErrors: { increment: errors },
            lastSeen: new Date(),
          },
        })
      );
      await Promise.all(upsertPromises);

      const updatedBigrams = Array.from(aggregated.keys());
      const bigramStats = await prisma.bigramStat.findMany({
        where: { userId: session.userId, bigram: { in: updatedBigrams } },
      });

      await Promise.all(
        bigramStats.map((stat) =>
          prisma.bigramStat.update({
            where: { id: stat.id },
            data: { errorRate: stat.totalAttempts > 0 ? stat.totalErrors / stat.totalAttempts : 0 },
          })
        )
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
          charsTyped: totalChars,
          accuracy,
          wpm,
        },
      });
    } else {
      const newPagesCompleted = typingSession.pagesCompleted + 1;
      const newCharsTyped = typingSession.charsTyped + totalChars;
      const newAccuracy = typingSession.accuracy
        ? (typingSession.accuracy * typingSession.pagesCompleted + accuracy) / newPagesCompleted
        : accuracy;
      const newWpm =
        typingSession.wpm && wpm
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
      pagesCompleted: typingSession.pagesCompleted,
      charsTyped: typingSession.charsTyped,
      ...(payload.mode === "KEYMAP" && { correct: payload.correct, exerciseId: payload.exerciseId }),
    });
  } catch (error) {
    console.error("Page complete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
