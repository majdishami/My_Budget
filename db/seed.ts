import { db } from "./index";
import { categories } from "./schema";

const defaultCategories = [
  {
    name: "Housing",
    color: "#2196F3",
    icon: "home"
  },
  {
    name: "Food",
    color: "#4CAF50",
    icon: "utensils"
  },
  {
    name: "Transportation",
    color: "#FFC107",
    icon: "car"
  },
  {
    name: "Entertainment",
    color: "#9C27B0",
    icon: "film"
  },
  {
    name: "Shopping",
    color: "#E91E63",
    icon: "shopping-bag"
  }
];

export async function seedCategories() {
  try {
    console.log('Starting categories seeding process...');

    // Check for existing categories with detailed logging
    console.log('Checking for existing categories...');
    const existingCategories = await db.select().from(categories);
    console.log(`Found ${existingCategories.length} existing categories`);

    if (existingCategories.length === 0) {
      console.log('No categories found. Seeding default categories:', JSON.stringify(defaultCategories, null, 2));
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
      console.log('Categories already exist, skipping seed');
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