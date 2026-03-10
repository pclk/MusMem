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
