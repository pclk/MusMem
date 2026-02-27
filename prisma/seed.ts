import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a demo user
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: {
      email: "demo@musmem.local",
      username: "demo",
      passwordHash,
      settings: {
        create: { charsPerPage: 200 },
      },
    },
  });

  console.log(`Seeded demo user: ${user.username} (id: ${user.id})`);
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
