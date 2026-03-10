import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface SessionData {
  userId?: string;
  email?: string;
  name?: string;
}

const DUMMY_SESSION_SECRET =
  "dummy_session_secret_for_local_development_only_123456";

let isUsingEnvExampleSessionSecret = false;

function ensureSessionSecretLength(secret: string): string {
  if (secret.length >= 32) {
    return secret;
  }

  return `${secret}${DUMMY_SESSION_SECRET}`.slice(0, 32);
}

function readSessionSecretFromEnvExample(): string | null {
  const envExamplePath = path.join(process.cwd(), ".env.example");

  if (!existsSync(envExamplePath)) {
    return null;
  }

  const envExample = readFileSync(envExamplePath, "utf8");
  const sessionSecretLine = envExample
    .split(/\r?\n/)
    .find((line) => line.trimStart().startsWith("SESSION_SECRET="));

  if (!sessionSecretLine) {
    return DUMMY_SESSION_SECRET;
  }

  const secret = sessionSecretLine.slice(sessionSecretLine.indexOf("=") + 1).trim();
  return ensureSessionSecretLength(secret || DUMMY_SESSION_SECRET);
}

function getSessionSecret(): string {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    const envExampleSecret = readSessionSecretFromEnvExample();

    if (envExampleSecret) {
      isUsingEnvExampleSessionSecret = true;
      return envExampleSecret;
    }

    isUsingEnvExampleSessionSecret = true;
    return DUMMY_SESSION_SECRET;
  }

  isUsingEnvExampleSessionSecret = false;

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

export function isSessionSecretFromEnvExample(): boolean {
  getSessionSecret();
  return isUsingEnvExampleSessionSecret;
}
