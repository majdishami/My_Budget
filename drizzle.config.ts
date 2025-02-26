import { defineDbConfig } from "drizzle-kit"; // Ensure this matches the actual export

export default defineDbConfig({
  schema: "./src/schema",
  out: "./drizzle",
  db: {
    client: "pg",
    connection: process.env.DATABASE_URL,
  },
});