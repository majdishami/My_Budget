import { db } from "./index";
import { categories } from "./schema";
import { isNull, sql } from "drizzle-orm";

const defaultCategories = [
  {
    name: "Rent",
    color: "#3B82F6",
    icon: "home",
    user_id: null,
  },
  {
    name: "Groceries",
    color: "#10B981",
    icon: "shopping-cart",
    user_id: null,
  },
  {
    name: "Personal Loan",
    color: "#6366F1",
    icon: "credit-card",
    user_id: null,
  },
  {
    name: "Car Insurance",
    color: "#F59E0B",
    icon: "car",
    user_id: null,
  },
  {
    name: "Maid's Service",
    color: "#EC4899",
    icon: "home",
    user_id: null,
  },
  {
    name: "Credit Card Payments",
    color: "#8B5CF6",
    icon: "credit-card",
    user_id: null,
  },
  {
    name: "Utilities - Electricity",
    color: "#F97316",
    icon: "zap",
    user_id: null,
  },
  {
    name: "Utilities - Gas",
    color: "#EF4444",
    icon: "flame",
    user_id: null,
  },
  {
    name: "Utilities - Water",
    color: "#3B82F6",
    icon: "droplet",
    user_id: null,
  },
  {
    name: "TV Service",
    color: "#8B5CF6",
    icon: "tv",
    user_id: null,
  },
  {
    name: "Internet",
    color: "#2563EB",
    icon: "wifi",
    user_id: null,
  },
  {
    name: "Online Services",
    color: "#6366F1",
    icon: "globe",
    user_id: null,
  },
  {
    name: "Life Insurance",
    color: "#059669",
    icon: "heart",
    user_id: null,
  },
  {
    name: "Others",
    color: "#71717A",
    icon: "more-horizontal",
    user_id: null,
  },
];

export async function seedCategories() {
  try {
    console.log('Starting categories seeding process...');

    // Check for existing categories with optimized COUNT query
    console.log('Checking for existing default categories...');
    const defaultCatsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .where(isNull(categories.user_id));

    const existingCategories = Number(defaultCatsCount[0]?.count) || 0;
    console.log(`Found ${existingCategories} default categories`);

    // Only seed if no default categories exist
    if (existingCategories === 0) {
      console.log('No default categories found. Seeding default categories...');
      try {
        // Insert new categories
        const result = await db.insert(categories).values(defaultCategories);
        console.log('Successfully seeded default categories');
        return result;
      } catch (error) {
        console.error('Error during category insertion:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    } else {
      console.log('Default categories already exist, skipping seed');
      return { skipped: true, existingCount: existingCategories };
    }
  } catch (error) {
    console.error('Fatal error in seedCategories:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}