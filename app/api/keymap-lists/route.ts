import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createKeymapList, findKeymapListByName, listKeymapLists } from "@/lib/keymap-lists";
import { createKeymapListSchema } from "@/lib/schemas/keymap-list";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const keymapLists = await listKeymapLists(session.userId);

    const listsWithCount = keymapLists.map(({ entries, ...list }) => ({
      ...list,
      entryCount: Array.isArray(entries) ? entries.length : 0,
    }));

    return NextResponse.json({ keymapLists: listsWithCount });
  } catch (error) {
    console.error("Keymap lists fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createKeymapListSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, exercises } = parsed.data;
    const existing = await findKeymapListByName(session.userId, name);

    if (existing) {
      return NextResponse.json(
        { error: "A keymap list with this name already exists" },
        { status: 409 }
      );
    }

    const keymapList = await createKeymapList(session.userId, name, exercises);

    return NextResponse.json(keymapList, { status: 201 });
  } catch (error) {
    console.error("Keymap list creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
