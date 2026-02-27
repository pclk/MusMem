import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import ws from "ws";

// Required for Neon serverless WebSocket connections in Node.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const neonConfig = require("@neondatabase/serverless").neonConfig;
neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Missing required environment variable: DATABASE_URL. Set it in your local .env file and in Vercel project settings (Production, Preview, and Development)."
  );
}

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

export default prisma;
