import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const defaultCategories = [
  {
    name: "Rent",
    color: "#3B82F6",
    icon: "home",
  },
  {
    name: "Groceries",
    color: "#10B981",
    icon: "shopping-cart",
  },
  {
    name: "Personal Loan",
    color: "#6366F1",
    icon: "credit-card",
  },
  {
    name: "Car Insurance",
    color: "#F59E0B",
    icon: "car",
  },
  {
    name: "Maid's Service",
    color: "#EC4899",
    icon: "home",
  },
  {
    name: "Credit Card Payments",
    color: "#8B5CF6",
    icon: "credit-card",
  },
  {
    name: "Utilities - Electricity",
    color: "#F97316",
    icon: "zap",
  },
  {
    name: "Utilities - Gas",
    color: "#EF4444",
    icon: "flame",
  },
  {
    name: "Utilities - Water",
    color: "#3B82F6",
    icon: "droplet",
  },
  {
    name: "TV Service",
    color: "#8B5CF6",
    icon: "tv",
  },
  {
    name: "Internet",
    color: "#2563EB",
    icon: "wifi",
  },
  {
    name: "Online Services",
    color: "#6366F1",
    icon: "globe",
  },
  {
    name: "Life Insurance",
    color: "#059669",
    icon: "heart",
  },
  {
    name: "Others",
    color: "#71717A",
    icon: "more-horizontal",
  },
];

export async function seedCategories() {
  try {
    const client = await pool.connect();

    // Check for existing categories with optimized COUNT query
    const defaultCatsCount = await client.query(`
      SELECT COUNT(*) as count
      FROM categories
    `);

    const existingCategories = Number(defaultCatsCount.rows[0]?.count) || 0;
    console.log(`Found ${existingCategories} default categories. ${existingCategories === 0 ? 'Seeding new categories...' : 'Skipping seeding.'}`);

    if (existingCategories === 0) {
      const insertQuery = `
        INSERT INTO categories (name, color, icon)
        VALUES ${defaultCategories.map(cat => `('${cat.name}', '${cat.color}', '${cat.icon}')`).join(', ')}
        ON CONFLICT DO NOTHING
      `;
      await client.query(insertQuery);
      console.log('Categories seeded successfully');
    }

    client.release();
  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  }
}