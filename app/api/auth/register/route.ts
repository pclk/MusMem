import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { registerSchema } from "@/lib/schemas/auth";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, username, password } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return NextResponse.json(
        { error: `A user with this ${field} already exists` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        settings: {
          create: { charsPerPage: 200 },
        },
      },
    });

    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    await session.save();

    return NextResponse.json(
      { id: user.id, username: user.username, email: user.email },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
