import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema",
  out: "./drizzle",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.ACCOUNT_ID,
    databaseId: process.env.DATABASE_ID,
    token: process.env.DATABASE_TOKEN,
  },
});