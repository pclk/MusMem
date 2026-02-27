import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { createWordListSchema } from "@/lib/schemas/wordlist";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const wordLists = await prisma.wordList.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        words: true,
        isDefault: true,
        createdAt: true,
      },
    });

    const listsWithCount = wordLists.map(({ words, ...list }) => ({
      ...list,
      wordCount: words.length,
    }));

    return NextResponse.json({ wordLists: listsWithCount });
  } catch (error) {
    console.error("Word lists fetch error:", error);
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
    const parsed = createWordListSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, words } = parsed.data;

    // Check for duplicate name
    const existing = await prisma.wordList.findUnique({
      where: { userId_name: { userId: session.userId, name } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A word list with this name already exists" },
        { status: 409 }
      );
    }

    const wordList = await prisma.wordList.create({
      data: {
        userId: session.userId,
        name,
        words,
      },
    });

    return NextResponse.json(wordList, { status: 201 });
  } catch (error) {
    console.error("Word list creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
