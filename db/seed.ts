import { db } from "./index";
import { categories } from "./schema";
import { sql } from "drizzle-orm";

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
    // Check for existing categories with optimized COUNT query
    const defaultCatsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories);

    const existingCategories = Number(defaultCatsCount[0]?.count) || 0;
    console.log(`Found ${existingCategories} default categories. ${existingCategories === 0 ? 'Seeding new categories...' : 'Skipping seeding.'}`);

    try {
      const result = await db.insert(categories)
        .values(defaultCategories)
        .onConflictDoNothing({ 
          target: [categories.name]
        });

      return {
        success: true,
        operation: 'upsert',
        existingCount: existingCategories,
        inserted: existingCategories === 0 ? defaultCategories.length : 0,
        skipped: existingCategories > 0,
        message: 'Categories initialization complete'
      };
    } catch (error) {
      console.error('Category upsert failed:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
        operation: 'category_upsert',
        dbQuery: "INSERT INTO categories (name, color, icon) VALUES ... ON CONFLICT DO NOTHING",
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  } catch (error) {
    console.error('Fatal seeding error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
      context: 'category_seeding',
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      operation: 'seeding',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}