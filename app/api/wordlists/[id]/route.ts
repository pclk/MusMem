import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";

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

    const wordList = await prisma.wordList.findFirst({
      where: { id, userId: session.userId },
    });

    if (!wordList) {
      return NextResponse.json({ error: "Word list not found" }, { status: 404 });
    }

    await prisma.wordList.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Word list delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
