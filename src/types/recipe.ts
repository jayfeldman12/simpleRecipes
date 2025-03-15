/**
 * Shared types for recipe-related data structures
 */

/**
 * Represents a single ingredient item
 */
export interface IngredientItem {
  text: string;
  optional?: boolean;
}

/**
 * Represents a section of ingredients (like "For the sauce")
 */
export interface IngredientSection {
  sectionTitle: string;
  ingredients: Array<IngredientItem | IngredientSection>;
}

/**
 * Union type for ingredient structure (can be either an item or a section)
 */
export type IngredientType = IngredientItem | IngredientSection;

/**
 * Represents a single instruction step
 */
export interface InstructionItem {
  text: string;
}

/**
 * Represents a complete recipe
 */
export interface Recipe {
  _id?: string;
  title: string;
  imageUrl?: string;
  description: string;
  ingredients: Array<IngredientType>;
  instructions: Array<InstructionItem>;
  cookingTime?: number;
  servings?: number;
  fullRecipe?: string;
  sourceUrl?: string;
  user?: {
    _id: string;
    username: string;
  };
  createdAt?: string;
  updatedAt?: string;
  isFavorite?: boolean;
  originalImageUrl?: string;
  index?: number;
}
