import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { loginSchema } from "@/lib/schemas/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    await session.save();

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
