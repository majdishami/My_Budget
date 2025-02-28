import { defineConfig } from "drizzle-kit";

interface CustomDbCredentials {
  connectionString: string;
}

export default defineConfig({
  schema: "./src/schema",
  out: "./drizzle",
  driver: "pg" as any, // Temporarily override type error
  dbCredentials: {
    connectionString: process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL is not defined") })(),
  } as CustomDbCredentials, // Temporarily override type error
});