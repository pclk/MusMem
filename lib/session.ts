import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  username?: string;
}

const sessionOptions = {
  password: (() => {
    const sessionSecret = process.env.SESSION_SECRET;

    if (sessionSecret) {
      return sessionSecret;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET is required in production. Set SESSION_SECRET to a strong random string with at least 32 characters."
      );
    }

    return "dev_only_session_secret_change_me_for_local_development";
  })(),
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
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
