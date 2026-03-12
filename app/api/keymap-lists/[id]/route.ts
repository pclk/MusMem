import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  deleteKeymapList,
  findKeymapListById,
  findKeymapListByName,
  updateKeymapList,
} from "@/lib/keymap-lists";
import { updateKeymapListSchema } from "@/lib/schemas/keymap-list";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = params;
    const keymapList = await findKeymapListById(session.userId, id);

    if (!keymapList) {
      return NextResponse.json({ error: "Keymap list not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateKeymapListSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, exercises } = parsed.data;
    const existing = await findKeymapListByName(session.userId, name);

    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "A keymap list with this name already exists" },
        { status: 409 }
      );
    }

    const updated = await updateKeymapList(session.userId, id, name, exercises);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Keymap list update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = params;
    const keymapList = await findKeymapListById(session.userId, id);

    if (!keymapList) {
      return NextResponse.json({ error: "Keymap list not found" }, { status: 404 });
    }

    await deleteKeymapList(session.userId, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Keymap list delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
