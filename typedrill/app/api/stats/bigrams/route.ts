import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const bigrams = await prisma.bigramStat.findMany({
      where: { userId: session.userId },
      orderBy: { errorRate: "desc" },
      select: {
        bigram: true,
        totalAttempts: true,
        totalErrors: true,
        errorRate: true,
        lastSeen: true,
      },
    });

    return NextResponse.json({ bigrams });
  } catch (error) {
    console.error("Bigram stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
