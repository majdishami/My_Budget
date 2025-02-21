import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function reindexCategories() {
  try {
    const client = await pool.connect();

    const existingCategories = await client.query('SELECT * FROM categories');

    // First, ensure all categories have icons
    const updatedCategories = existingCategories.rows.map(cat => ({
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
      await client.query('UPDATE bills SET category_id = $1 WHERE category_id = $2', [newId, oldId]);

      // Update transactions references
      await client.query('UPDATE transactions SET category_id = $1 WHERE category_id = $2', [newId, oldId]);

      // Update category
      const category = updatedCategories.find(c => c.id === oldId);
      if (category) {
        await client.query('UPDATE categories SET id = $1, icon = $2, color = $3 WHERE id = $4', [newId, category.icon, category.color, oldId]);
      }
    }

    // Reset the sequence
    await client.query('SELECT setval(\'categories_id_seq\', (SELECT MAX(id) FROM categories))');

    // Verify the results
    const reindexedCategories = await client.query('SELECT * FROM categories ORDER BY id');

    client.release();

    return {
      success: true,
      message: 'Categories reindexed and standardized successfully',
      categories: reindexedCategories.rows
    };
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