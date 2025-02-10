import { db } from "./index";
import { categories } from "./schema";
import { eq } from "drizzle-orm";

const defaultCategories = [
  {
    name: "Rent",
    color: "#3B82F6",
    icon: "home",
    user_id: null
  },
  {
    name: "Groceries",
    color: "#10B981",
    icon: "shopping-cart",
    user_id: null
  },
  {
    name: "Personal Loan",
    color: "#6366F1",
    icon: "credit-card",
    user_id: null
  },
  {
    name: "Car Insurance",
    color: "#F59E0B",
    icon: "car",
    user_id: null
  },
  {
    name: "Maid's Service",
    color: "#EC4899",
    icon: "home",
    user_id: null
  },
  {
    name: "Credit Card Payments",
    color: "#8B5CF6",
    icon: "credit-card",
    user_id: null
  },
  {
    name: "Utilities - Electricity",
    color: "#F97316",
    icon: "zap",
    user_id: null
  },
  {
    name: "Utilities - Gas",
    color: "#EF4444",
    icon: "flame",
    user_id: null
  },
  {
    name: "Utilities - Water",
    color: "#3B82F6",
    icon: "droplet",
    user_id: null
  },
  {
    name: "TV Service",
    color: "#8B5CF6",
    icon: "tv",
    user_id: null
  },
  {
    name: "Internet",
    color: "#2563EB",
    icon: "wifi",
    user_id: null
  },
  {
    name: "Online Services",
    color: "#6366F1",
    icon: "globe",
    user_id: null
  },
  {
    name: "Life Insurance",
    color: "#059669",
    icon: "heart",
    user_id: null
  },
  {
    name: "Others",
    color: "#71717A",
    icon: "more-horizontal",
    user_id: null
  }
];

export async function seedCategories() {
  try {
    console.log('Starting categories seeding process...');

    // Check for existing categories with detailed logging
    console.log('Checking for existing categories...');
    const existingCategories = await db.select().from(categories)
      .where(eq(categories.user_id, null));
    console.log(`Found ${existingCategories.length} existing categories`);

    if (existingCategories.length === 0) {
      console.log('No default categories found. Seeding default categories:', JSON.stringify(defaultCategories, null, 2));
      try {
        const result = await db.insert(categories).values(defaultCategories).returning();
        console.log('Successfully seeded default categories:', result);
        return result;
      } catch (error) {
        console.error('Error during category insertion:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack
          });
        }
        throw error;
      }
    } else {
      console.log('Default categories already exist, skipping seed');
      return existingCategories;
    }
  } catch (error) {
    console.error('Fatal error in seedCategories:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}