import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  username?: string;
}

const fallbackSessionSecret = "dev-only-session-secret-change-me-123";

function getSessionSecret(): string {
  const sessionSecret = process.env.SESSION_SECRET;

  if (sessionSecret) {
    return sessionSecret;
  }

  return fallbackSessionSecret;
}

function getSessionOptions() {
  return {
    password: getSessionSecret(),
    cookieName: "musmem_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 1 week
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}
