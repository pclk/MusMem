import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { KeymapListExerciseInput } from "@/lib/schemas/keymap-list";

export interface KeymapListRow {
  id: string;
  userId: string;
  name: string;
  entries: unknown;
  createdAt: Date;
}

function isMissingKeymapListSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const rawError = error as { code?: string; meta?: { code?: string } };
  return rawError.code === "P2010" && rawError.meta?.code === "42P01";
}

const keymapListColumns = Prisma.sql`
  "id",
  "userId",
  "name",
  "entries",
  "createdAt"
`;

export async function listKeymapLists(userId: string): Promise<KeymapListRow[]> {
  try {
    return await prisma.$queryRaw<KeymapListRow[]>`
      SELECT ${keymapListColumns}
      FROM "KeymapList"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
    `;
  } catch (error) {
    if (isMissingKeymapListSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export async function findKeymapListById(
  userId: string,
  id: string
): Promise<KeymapListRow | null> {
  try {
    const rows = await prisma.$queryRaw<KeymapListRow[]>`
      SELECT ${keymapListColumns}
      FROM "KeymapList"
      WHERE "userId" = ${userId} AND "id" = ${id}
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch (error) {
    if (isMissingKeymapListSchemaError(error)) {
      return null;
    }
    throw error;
  }
}

export async function findKeymapListByName(
  userId: string,
  name: string
): Promise<KeymapListRow | null> {
  try {
    const rows = await prisma.$queryRaw<KeymapListRow[]>`
      SELECT ${keymapListColumns}
      FROM "KeymapList"
      WHERE "userId" = ${userId} AND "name" = ${name}
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch (error) {
    if (isMissingKeymapListSchemaError(error)) {
      return null;
    }
    throw error;
  }
}

export async function createKeymapList(
  userId: string,
  name: string,
  entries: KeymapListExerciseInput[]
): Promise<KeymapListRow> {
  const id = randomUUID();
  const rows = await prisma.$queryRaw<KeymapListRow[]>(Prisma.sql`
    INSERT INTO "KeymapList" ("id", "userId", "name", "entries", "createdAt")
    VALUES (${id}, ${userId}, ${name}, ${JSON.stringify(entries)}::jsonb, NOW())
    RETURNING ${keymapListColumns}
  `);

  return rows[0];
}

export async function updateKeymapList(
  userId: string,
  id: string,
  name: string,
  entries: KeymapListExerciseInput[]
): Promise<KeymapListRow> {
  const rows = await prisma.$queryRaw<KeymapListRow[]>(Prisma.sql`
    UPDATE "KeymapList"
    SET "name" = ${name}, "entries" = ${JSON.stringify(entries)}::jsonb
    WHERE "userId" = ${userId} AND "id" = ${id}
    RETURNING ${keymapListColumns}
  `);

  return rows[0];
}

export async function deleteKeymapList(userId: string, id: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "KeymapList"
    WHERE "userId" = ${userId} AND "id" = ${id}
  `;
}
