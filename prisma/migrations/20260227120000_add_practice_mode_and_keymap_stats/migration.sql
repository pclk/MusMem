-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('TEXT', 'KEYMAP');

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "mode" "PracticeMode" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "KeymapCommandStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "totalLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" DOUBLE PRECISION,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeymapCommandStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeymapCommandStat_userId_exerciseId_key" ON "KeymapCommandStat"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "KeymapCommandStat_userId_errors_idx" ON "KeymapCommandStat"("userId", "errors" DESC);

-- AddForeignKey
ALTER TABLE "KeymapCommandStat" ADD CONSTRAINT "KeymapCommandStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
