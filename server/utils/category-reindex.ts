import { db } from '@db';
import { categories, bills, transactions } from '@db/schema';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export async function reindexCategories() {
  console.log('Starting category reindexing...');

  try {
    return await db.transaction(async (tx) => {
      // Get all categories ordered by name
      const existingCategories = await tx.select().from(categories).orderBy(categories.name);
      console.log(`Found ${existingCategories.length} categories to reindex`);

      // Create a mapping of old to new IDs
      const idMapping = new Map<number, number>();
      existingCategories.forEach((cat, index) => {
        idMapping.set(cat.id, index + 1000); // Temporary high IDs to avoid conflicts
      });

      // First pass: Update to temporary high IDs
      for (const category of existingCategories) {
        const tempId = idMapping.get(category.id);
        if (!tempId) continue;

        // Update bills references to temp ID
        await tx.update(bills)
          .set({ category_id: tempId })
          .where(eq(bills.category_id, category.id));

        // Update transactions references to temp ID
        await tx.update(transactions)
          .set({ category_id: tempId })
          .where(eq(transactions.category_id, category.id));

        // Update category to temp ID
        await tx.update(categories)
          .set({ id: tempId })
          .where(eq(categories.id, category.id));
      }

      // Second pass: Update from temp IDs to final sequential IDs
      const finalIdMapping = new Map<number, number>();
      existingCategories.forEach((cat, index) => {
        finalIdMapping.set(index + 1000, index + 1); // Map temp IDs to final sequential IDs
      });

      for (const [tempId, finalId] of finalIdMapping.entries()) {
        // Update bills references to final ID
        await tx.update(bills)
          .set({ category_id: finalId })
          .where(eq(bills.category_id, tempId));

        // Update transactions references to final ID
        await tx.update(transactions)
          .set({ category_id: finalId })
          .where(eq(transactions.category_id, tempId));

        // Update category to final ID
        await tx.update(categories)
          .set({ id: finalId })
          .where(eq(categories.id, tempId));
      }

      // Reset the sequence
      await tx.execute(sql`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))`);

      // Verify the results
      const updatedCategories = await tx.select().from(categories).orderBy(categories.id);

      return {
        success: true,
        message: 'Categories reindexed successfully',
        categories: updatedCategories
      };
    });
  } catch (error) {
    console.error('Error reindexing categories:', error);
    throw error;
  }
}