import { makeConfig } from "drizzle-kit";

export default makeConfig({
  schema: "./src/schema",
  out: "./drizzle",
  db: {
    client: "pg",
    connection: process.env.DATABASE_URL,
  },
});