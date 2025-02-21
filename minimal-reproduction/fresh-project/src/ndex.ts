import { db, pool } from '@db';
import { users, insertUserSchema } from '@db/schema';
import { eq } from 'drizzle-orm';

console.log(db, pool, users, insertUserSchema, eq);