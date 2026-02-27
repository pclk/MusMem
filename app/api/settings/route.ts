import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { updateSettingsSchema } from "@/lib/schemas/settings";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
      include: { activeList: { select: { id: true, name: true } } },
    });

    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { charsPerPage, targetedPracticeRatio, mode, activeListId } = parsed.data;

    // Validate activeListId belongs to user if provided
    if (activeListId) {
      const list = await prisma.wordList.findFirst({
        where: { id: activeListId, userId: session.userId },
      });
      if (!list) {
        return NextResponse.json({ error: "Word list not found" }, { status: 404 });
      }
    }

    const settings = await prisma.userSettings.update({
      where: { userId: session.userId },
      data: {
        ...(charsPerPage !== undefined && { charsPerPage }),
        ...(targetedPracticeRatio !== undefined && { targetedPracticeRatio }),
        ...(mode !== undefined && { mode }),
        ...(activeListId !== undefined && { activeListId }),
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
