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

      // First, ensure all categories have icons
      const updatedCategories = existingCategories.map(cat => ({
        ...cat,
        icon: cat.icon || getDefaultIcon(cat.name),
        color: cat.color || getDefaultColor(cat.name)
      }));

      // Create a mapping of old to new IDs
      const idMapping = new Map<number, number>();
      updatedCategories.forEach((cat, index) => {
        idMapping.set(cat.id, index + 1); // Start from 1 for the new sequential IDs
      });

      // Update references and categories
      for (const [oldId, newId] of idMapping) {
        // Update bills references
        await tx.update(bills)
          .set({ category_id: newId })
          .where(eq(bills.category_id, oldId));

        // Update transactions references
        await tx.update(transactions)
          .set({ category_id: newId })
          .where(eq(transactions.category_id, oldId));

        // Update category
        const category = updatedCategories.find(c => c.id === oldId);
        if (category) {
          await tx.update(categories)
            .set({ 
              id: newId,
              icon: category.icon,
              color: category.color 
            })
            .where(eq(categories.id, oldId));
        }
      }

      // Reset the sequence
      await tx.execute(sql`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))`);

      // Verify the results
      const reindexedCategories = await tx.select().from(categories).orderBy(categories.id);

      return {
        success: true,
        message: 'Categories reindexed and standardized successfully',
        categories: reindexedCategories
      };
    });
  } catch (error) {
    console.error('Error reindexing categories:', error);
    throw error;
  }
}

// Helper functions for default values
function getDefaultIcon(categoryName: string): string {
  const defaultIcons: Record<string, string> = {
    'Rent': 'home',
    'Groceries': 'shopping-cart',
    'Transport': 'car',
    'Utilities': 'zap',
    'Entertainment': 'film',
    'Healthcare': 'heart',
    'Insurance': 'shield',
    'Education': 'book',
    'Shopping': 'shopping-bag',
    'Food': 'utensils',
    'Travel': 'plane',
    'Phone': 'phone',
    'Internet': 'wifi',
    'Gym': 'activity',
    'Savings': 'piggy-bank',
    'Investment': 'trending-up',
    'Salary': 'dollar-sign',
    'Freelance': 'briefcase',
    'Other': 'circle'
  };

  const lowercaseName = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(defaultIcons)) {
    if (lowercaseName.includes(key.toLowerCase())) {
      return icon;
    }
  }
  return 'circle'; // Default fallback icon
}

function getDefaultColor(categoryName: string): string {
  const defaultColors: Record<string, string> = {
    'Rent': '#FF5733',
    'Groceries': '#33FF57',
    'Transport': '#3357FF',
    'Utilities': '#FF33F5',
    'Entertainment': '#33FFF5',
    'Other': '#808080'
  };

  const lowercaseName = categoryName.toLowerCase();
  for (const [key, color] of Object.entries(defaultColors)) {
    if (lowercaseName.includes(key.toLowerCase())) {
      return color;
    }
  }
  return '#808080'; // Default gray color
}