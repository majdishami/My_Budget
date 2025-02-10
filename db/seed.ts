import { db } from "./index";
import { categories } from "./schema";

const defaultCategories = [
  {
    name: "Housing",
    color: "#2196F3",
    icon: "home",
    user_id: null
  },
  {
    name: "Food",
    color: "#4CAF50",
    icon: "utensils",
    user_id: null
  },
  {
    name: "Transportation",
    color: "#FFC107",
    icon: "car",
    user_id: null
  },
  {
    name: "Entertainment",
    color: "#9C27B0",
    icon: "film",
    user_id: null
  },
  {
    name: "Shopping",
    color: "#E91E63",
    icon: "shopping-bag",
    user_id: null
  }
];

export async function seedCategories() {
  try {
    console.log('Starting categories seeding process...');

    // Check for existing categories with detailed logging
    console.log('Checking for existing categories...');
    const existingCategories = await db.select().from(categories)
      .where(categories => categories.user_id.isNull());
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