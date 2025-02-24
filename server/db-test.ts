import { db, pool } from "@db";
import { transactions, categories } from "@db/schema";

async function testDatabaseConnection() {
  console.log('Testing database connection...');

  try {
    console.log('Testing pool connection...');
    const client = await pool.connect();
    console.log('Pool connection successful');
    client.release();

    console.log('Testing Drizzle ORM connection...');
    const result = await db.select().from(categories).limit(1);
    console.log('Drizzle query successful:', result);

    console.log('All database connection tests passed');
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }
}

testDatabaseConnection().catch(console.error);