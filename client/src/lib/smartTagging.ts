import { Category } from "@/types";

interface TagMatch {
  category: Category;
  confidence: number;
}

// Common expense patterns for different categories
const categoryPatterns: Record<string, string[]> = {
  "Utilities": [
    "electric", "electricity", "power", "energy", "water", "gas", "utility", 
    "internet", "wifi", "broadband", "phone", "cellular", "mobile"
  ],
  "Housing": [
    "rent", "mortgage", "hoa", "maintenance", "repair", "property tax",
    "insurance", "home", "house", "apartment"
  ],
  "Transportation": [
    "gas", "fuel", "parking", "car", "auto", "vehicle", "maintenance",
    "repair", "insurance", "uber", "lyft", "taxi", "bus", "train"
  ],
  "Food": [
    "grocery", "groceries", "restaurant", "dining", "food", "meal",
    "breakfast", "lunch", "dinner", "takeout", "delivery"
  ],
  "Entertainment": [
    "movie", "theatre", "concert", "show", "game", "streaming",
    "netflix", "hulu", "spotify", "apple", "subscription"
  ],
  "Healthcare": [
    "doctor", "medical", "health", "dental", "vision", "prescription",
    "medicine", "pharmacy", "hospital", "clinic", "insurance"
  ]
};

/**
 * Find the best matching category for an expense description
 */
export function findBestCategoryMatch(
  description: string, 
  categories: Category[],
  existingCategories?: Map<string, string>
): TagMatch | null {
  const normalizedDescription = description.toLowerCase();
  let bestMatch: TagMatch | null = null;

  // First check if we have an exact historical match
  if (existingCategories && existingCategories.has(normalizedDescription)) {
    const historicalCategoryId = existingCategories.get(normalizedDescription);
    const category = categories.find(c => c.id.toString() === historicalCategoryId);
    if (category) {
      return {
        category,
        confidence: 1.0 // Historical matches get 100% confidence
      };
    }
  }

  // Then try pattern matching
  for (const category of categories) {
    const patterns = categoryPatterns[category.name];
    if (!patterns) continue;

    for (const pattern of patterns) {
      if (normalizedDescription.includes(pattern)) {
        const confidence = calculateConfidence(normalizedDescription, pattern);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { category, confidence };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Calculate how confident we are in the match
 */
function calculateConfidence(description: string, pattern: string): number {
  // Basic confidence calculation based on:
  // 1. How much of the description the pattern covers
  // 2. Position of the match (earlier matches are weighted more heavily)
  const descLength = description.length;
  const patternLength = pattern.length;
  const position = description.indexOf(pattern);
  
  // Calculate coverage (0-0.5)
  const coverage = Math.min(0.5, (patternLength / descLength) * 0.5);
  
  // Calculate position score (0-0.5)
  // Earlier positions get higher scores
  const positionScore = 0.5 * (1 - (position / descLength));
  
  return coverage + positionScore;
}

/**
 * Build a map of historical expense descriptions to category IDs
 */
export function buildHistoricalCategories(expenses: { description: string; category_id: string | number }[]): Map<string, string> {
  const historicalMap = new Map<string, string>();
  
  for (const expense of expenses) {
    if (expense.category_id) {
      historicalMap.set(
        expense.description.toLowerCase(),
        expense.category_id.toString()
      );
    }
  }
  
  return historicalMap;
}
