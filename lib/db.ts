import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import ws from "ws";

// Required for Neon serverless WebSocket connections in Node.js
const neonConfig = require("@neondatabase/serverless").neonConfig;
neonConfig.webSocketConstructor = ws;

const fallbackDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return databaseUrl;
  }

  return fallbackDatabaseUrl;
}

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

export default prisma;
