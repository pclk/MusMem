-- CreateTable
CREATE TABLE "KeymapList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeymapList_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "keymapListId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "KeymapList_userId_name_key" ON "KeymapList"("userId", "name");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_keymapListId_fkey" FOREIGN KEY ("keymapListId") REFERENCES "KeymapList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeymapList" ADD CONSTRAINT "KeymapList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
