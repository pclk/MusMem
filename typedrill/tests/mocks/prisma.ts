import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";
import { beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

import prisma from "@/lib/db";

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
