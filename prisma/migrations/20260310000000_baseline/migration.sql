-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('TEXT', 'KEYMAP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "charsPerPage" INTEGER NOT NULL DEFAULT 200,
    "targetedPracticeRatio" INTEGER NOT NULL DEFAULT 60,
    "mode" "PracticeMode" NOT NULL DEFAULT 'TEXT',
    "activeListId" TEXT,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "BigramStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bigram" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalErrors" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BigramStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "pagesCompleted" INTEGER NOT NULL DEFAULT 0,
    "charsTyped" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "wpm" DOUBLE PRECISION,

    CONSTRAINT "TypingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "words" TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "KeymapCommandStat_userId_errors_idx" ON "KeymapCommandStat"("userId", "errors" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "KeymapCommandStat_userId_exerciseId_key" ON "KeymapCommandStat"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "BigramStat_userId_errorRate_idx" ON "BigramStat"("userId", "errorRate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BigramStat_userId_bigram_key" ON "BigramStat"("userId", "bigram");

-- CreateIndex
CREATE UNIQUE INDEX "WordList_userId_name_key" ON "WordList"("userId", "name");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_activeListId_fkey" FOREIGN KEY ("activeListId") REFERENCES "WordList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeymapCommandStat" ADD CONSTRAINT "KeymapCommandStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BigramStat" ADD CONSTRAINT "BigramStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypingSession" ADD CONSTRAINT "TypingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordList" ADD CONSTRAINT "WordList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

