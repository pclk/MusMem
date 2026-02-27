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

    const { targetText, typedText, keystrokeTimings } = parsed.data;

    // Extract and aggregate bigram results
    const bigramResults = extractBigramResults(targetText, typedText);
    const aggregated = aggregateBigramResults(bigramResults);

    // Upsert bigram stats
    const upsertPromises = Array.from(aggregated.entries()).map(
      ([bigram, { attempts, errors }]) =>
        prisma.bigramStat.upsert({
          where: {
            userId_bigram: { userId: session.userId!, bigram },
          },
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

    // Recompute error rates for updated bigrams
    const updatedBigrams = Array.from(aggregated.keys());
    const bigramStats = await prisma.bigramStat.findMany({
      where: {
        userId: session.userId,
        bigram: { in: updatedBigrams },
      },
    });

    const rateUpdatePromises = bigramStats.map((stat) =>
      prisma.bigramStat.update({
        where: { id: stat.id },
        data: {
          errorRate: stat.totalAttempts > 0 ? stat.totalErrors / stat.totalAttempts : 0,
        },
      })
    );

    await Promise.all(rateUpdatePromises);

    // Calculate session stats
    const correctChars = keystrokeTimings.filter((k) => k.correct).length;
    const totalChars = keystrokeTimings.length;
    const accuracy = calculateAccuracy(correctChars, totalChars);

    let wpm: number | null = null;
    if (keystrokeTimings.length >= 2) {
      const duration =
        keystrokeTimings[keystrokeTimings.length - 1].timestamp -
        keystrokeTimings[0].timestamp;
      wpm = calculateWpm(totalChars, duration);
    }

    // Find or create active session, update it
    let typingSession = await prisma.typingSession.findFirst({
      where: {
        userId: session.userId,
        completedAt: null,
      },
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
        ? (typingSession.accuracy * typingSession.pagesCompleted + accuracy) /
          newPagesCompleted
        : accuracy;
      const newWpm =
        typingSession.wpm && wpm
          ? (typingSession.wpm * typingSession.pagesCompleted + wpm) /
            newPagesCompleted
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
      accuracy,
      wpm,
      pagesCompleted: typingSession.pagesCompleted,
      charsTyped: typingSession.charsTyped,
    });
  } catch (error) {
    console.error("Page complete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
