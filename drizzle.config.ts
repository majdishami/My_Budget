import { defineSchema } from "drizzle-kit";

export default defineSchema({
  schema: "./src/schema",
  out: "./drizzle",
  db: {
    client: "pg",
    connection: process.env.DATABASE_URL,
  },
});