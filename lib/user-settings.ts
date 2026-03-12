import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";

export interface UserSettingsRow {
  id: string;
  userId: string;
  charsPerPage: number;
  targetedPracticeRatio: number;
  bigramWindowSize: number;
  mode: "TEXT" | "KEYMAP";
  activeListId: string | null;
  keymapListId: string | null;
}

function isMissingKeymapSettingsSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const rawError = error as { code?: string; meta?: { code?: string } };
  return rawError.code === "P2010" && (
    rawError.meta?.code === "42P01" ||
    rawError.meta?.code === "42703"
  );
}

async function getLegacyUserSettings(userId: string): Promise<UserSettingsRow | null> {
  const rows = await prisma.$queryRaw<UserSettingsRow[]>`
    SELECT
      "id",
      "userId",
      "charsPerPage",
      "targetedPracticeRatio",
      "bigramWindowSize",
      "mode",
      "activeListId",
      NULL::text AS "keymapListId"
    FROM "UserSettings"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getUserSettings(userId: string): Promise<UserSettingsRow | null> {
  try {
    const rows = await prisma.$queryRaw<UserSettingsRow[]>`
      SELECT
        "id",
        "userId",
        "charsPerPage",
        "targetedPracticeRatio",
        "bigramWindowSize",
        "mode",
        "activeListId",
        "keymapListId"
      FROM "UserSettings"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch (error) {
    if (isMissingKeymapSettingsSchemaError(error)) {
      return getLegacyUserSettings(userId);
    }
    throw error;
  }
}

export async function updateUserSettings(
  userId: string,
  patch: Partial<Omit<UserSettingsRow, "id" | "userId">>
): Promise<UserSettingsRow | null> {
  const updates: Prisma.Sql[] = [];
  const legacyUpdates: Prisma.Sql[] = [];

  if (patch.charsPerPage !== undefined) {
    const statement = Prisma.sql`"charsPerPage" = ${patch.charsPerPage}`;
    updates.push(statement);
    legacyUpdates.push(statement);
  }
  if (patch.targetedPracticeRatio !== undefined) {
    const statement = Prisma.sql`"targetedPracticeRatio" = ${patch.targetedPracticeRatio}`;
    updates.push(statement);
    legacyUpdates.push(statement);
  }
  if (patch.bigramWindowSize !== undefined) {
    const statement = Prisma.sql`"bigramWindowSize" = ${patch.bigramWindowSize}`;
    updates.push(statement);
    legacyUpdates.push(statement);
  }
  if (patch.mode !== undefined) {
    const statement = Prisma.sql`"mode" = CAST(${patch.mode} AS "PracticeMode")`;
    updates.push(statement);
    legacyUpdates.push(statement);
  }
  if (patch.activeListId !== undefined) {
    const statement = Prisma.sql`"activeListId" = ${patch.activeListId}`;
    updates.push(statement);
    legacyUpdates.push(statement);
  }
  if (patch.keymapListId !== undefined) {
    updates.push(Prisma.sql`"keymapListId" = ${patch.keymapListId}`);
  }

  if (updates.length === 0) {
    return getUserSettings(userId);
  }

  try {
    const rows = await prisma.$queryRaw<UserSettingsRow[]>(Prisma.sql`
      UPDATE "UserSettings"
      SET ${Prisma.join(updates, ", ")}
      WHERE "userId" = ${userId}
      RETURNING
        "id",
        "userId",
        "charsPerPage",
        "targetedPracticeRatio",
        "bigramWindowSize",
        "mode",
        "activeListId",
        "keymapListId"
    `);

    return rows[0] ?? null;
  } catch (error) {
    if (!isMissingKeymapSettingsSchemaError(error)) {
      throw error;
    }

    if (legacyUpdates.length === 0) {
      return getLegacyUserSettings(userId);
    }

    const rows = await prisma.$queryRaw<UserSettingsRow[]>(Prisma.sql`
      UPDATE "UserSettings"
      SET ${Prisma.join(legacyUpdates, ", ")}
      WHERE "userId" = ${userId}
      RETURNING
        "id",
        "userId",
        "charsPerPage",
        "targetedPracticeRatio",
        "bigramWindowSize",
        "mode",
        "activeListId",
        NULL::text AS "keymapListId"
    `);

    return rows[0] ?? null;
  }
}
