import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a demo user
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@musmem.local" },
    update: { name: "Demo User" },
    create: {
      name: "Demo User",
      email: "demo@musmem.local",
      passwordHash,
      settings: {
        create: { charsPerPage: 200, targetedPracticeRatio: 60 },
      },
    },
  });

  console.log(`Seeded demo user: ${user.email} (id: ${user.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
