import { defineDbConfig } from "drizzle-kit";

export default defineDbConfig({
  schema: "./src/schema",
  out: "./drizzle",
  db: {
    client: "pg",
    connection: process.env.DATABASE_URL,
  },
});