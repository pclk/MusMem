import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { findKeymapListById } from "@/lib/keymap-lists";
import { listProjectKeymapLists } from "@/lib/keymaps/project-lists";
import { updateSettingsSchema } from "@/lib/schemas/settings";
import { getUserSettings, updateUserSettings } from "@/lib/user-settings";
import { listProjectWordLists } from "@/lib/wordlists/project-lists";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const settings = await getUserSettings(session.userId);

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

    const {
      charsPerPage,
      targetedPracticeRatio,
      bigramWindowSize,
      mode,
      activeListId,
      keymapListId,
    } = parsed.data;
    const projectWordListIds = new Set((await listProjectWordLists()).map((list) => list.id));
    const projectKeymapListIds = new Set((await listProjectKeymapLists()).map((list) => list.id));

    // Validate activeListId belongs to user if provided
    if (activeListId) {
      if (projectWordListIds.has(activeListId)) {
        return NextResponse.json(
          { error: "Project .txt word lists are session-only. Import them into a custom list to save them." },
          { status: 400 }
        );
      }

      const list = await prisma.wordList.findFirst({
        where: { id: activeListId, userId: session.userId },
      });
      if (!list) {
        return NextResponse.json({ error: "Word list not found" }, { status: 404 });
      }
    }

    if (keymapListId) {
      if (projectKeymapListIds.has(keymapListId)) {
        return NextResponse.json(
          { error: "Project .txt keymap lists are session-only. Import them into a custom list to save them." },
          { status: 400 }
        );
      }

      const list = await findKeymapListById(session.userId, keymapListId);
      if (!list) {
        return NextResponse.json({ error: "Keymap list not found" }, { status: 404 });
      }
    }

    const settings = await updateUserSettings(session.userId, {
      ...(charsPerPage !== undefined && { charsPerPage }),
      ...(targetedPracticeRatio !== undefined && { targetedPracticeRatio }),
      ...(bigramWindowSize !== undefined && { bigramWindowSize }),
      ...(mode !== undefined && { mode }),
      ...(activeListId !== undefined && { activeListId }),
      ...(keymapListId !== undefined && { keymapListId }),
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
