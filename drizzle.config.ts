import { defineDbConfig } from "drizzle-kit"; // Replace with the correct function if this is incorrect

export default defineDbConfig({
  schema: "./src/schema",
  out: "./drizzle",
  db: {
    client: "pg",
    connection: process.env.DATABASE_URL,
  },
});