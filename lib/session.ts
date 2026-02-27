import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  username?: string;
}

function getSessionSecret(): string {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET is not set in production runtime. Set SESSION_SECRET to a strong random string with at least 32 characters."
      );
    }

    throw new Error(
      "SESSION_SECRET is not set. Define SESSION_SECRET in your environment (for example, in .env.local) with at least 32 characters."
    );
  }

  if (sessionSecret.length < 32) {
    throw new Error(
      `SESSION_SECRET must be at least 32 characters long. Received ${sessionSecret.length} characters.`
    );
  }

  return sessionSecret;
}

const sessionOptions = {
  cookieName: "musmem_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    ...sessionOptions,
    password: getSessionSecret(),
  });
}
