import { db } from '@db';
import { categories, bills, transactions } from '@db/schema';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export async function reindexCategories() {
  console.log('Starting category reindexing...');
  
  try {
    // Get all categories ordered by name
    const existingCategories = await db.select().from(categories).orderBy(categories.name);
    console.log(`Found ${existingCategories.length} categories to reindex`);

    // Create a mapping of old to new IDs
    const idMapping = new Map<number, number>();
    existingCategories.forEach((cat, index) => {
      idMapping.set(cat.id, index + 1);
    });

    // Start transaction to ensure atomic updates
    return await db.transaction(async (tx) => {
      for (const category of existingCategories) {
        const newId = idMapping.get(category.id);
        if (!newId) continue;

        // Update bills first
        await tx.update(bills)
          .set({ category_id: newId })
          .where(eq(bills.category_id, category.id));

        // Update transactions
        await tx.update(transactions)
          .set({ category_id: newId })
          .where(eq(transactions.category_id, category.id));

        // Update category
        if (newId !== category.id) {
          await tx.update(categories)
            .set({ id: newId })
            .where(eq(categories.id, category.id));
        }
      }

      // Reset the sequence
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX(id) FROM categories))`);

      return {
        success: true,
        message: 'Categories reindexed successfully',
        totalCategories: existingCategories.length
      };
    });
  } catch (error) {
    console.error('Error reindexing categories:', error);
    throw error;
  }
}
