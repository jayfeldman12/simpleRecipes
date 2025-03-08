import Recipe from "../models/Recipe";
import { IRecipeDocument } from "../models/types";
import { connectDB } from "./auth";

/**
 * Utility function to compute the difference between two objects
 * Returns an object containing only the properties that changed
 */
function computeDiff(
  original: Record<string, any>,
  updated: Record<string, any>
): Record<string, any> {
  const diff: Record<string, any> = {};

  // Find all keys in either object and convert to Array for iteration
  const allKeys = Array.from(
    new Set([...Object.keys(original), ...Object.keys(updated)])
  );

  // Check each key for differences
  for (const key of allKeys) {
    const originalValue = original[key];
    const updatedValue = updated[key];

    // Skip functions, complex objects that can't be stringified easily
    if (
      typeof originalValue === "function" ||
      typeof updatedValue === "function"
    ) {
      continue;
    }

    // Compare using JSON.stringify for simple comparison
    if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
      diff[key] = {
        before: originalValue,
        after: updatedValue,
      };
    }
  }

  return diff;
}

/**
 * Options for batch operations
 */
export interface BatchOperationOptions {
  /** If true, changes will only be logged and not saved */
  debug?: boolean;
  /** If true, will log before and after states of each document */
  verbose?: boolean;
  /** Maximum number of documents to process (for testing) */
  limit?: number;
}

/**
 * Batch operation summary
 */
export interface BatchOperationResult {
  processed: number;
  changed: number;
  errors: number;
  debug: boolean;
}

/**
 * Type for transform functions that process each recipe
 */
export type RecipeTransformFn = (
  recipe: IRecipeDocument,
  index: number
) => IRecipeDocument;

/**
 * Batch update all recipes with a transform function
 * @param transformFn Function that receives a recipe and returns the modified recipe
 * @param options Configuration options
 * @returns Summary of the operation
 */
export async function batchUpdateRecipes(
  transformFn: RecipeTransformFn,
  options: BatchOperationOptions = {}
): Promise<BatchOperationResult> {
  // Connect to database
  await connectDB();

  // Set default options
  const { debug = false, verbose = true, limit } = options;

  console.log(
    `🔄 Starting batch operation on recipes${debug ? " (DEBUG MODE)" : ""}`
  );
  if (limit) {
    console.log(`⚠️ Limited to ${limit} documents`);
  }

  // Stats
  let processed = 0;
  let changed = 0;
  let errors = 0;

  try {
    // Build query
    let query = Recipe.find();

    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    // Fetch all recipes
    const recipes = await query.exec();
    console.log(`📋 Found ${recipes.length} recipes to process`);

    // Process each recipe
    for (const recipe of recipes) {
      try {
        // Store original for logging and potential rollback
        const original = recipe.toJSON();
        const currentIndex = recipes.indexOf(recipe);
        // Apply transform function with the current recipe and its index
        const transformed = transformFn(recipe, currentIndex);
        // Detect if anything changed
        const didChange =
          JSON.stringify(original) !== JSON.stringify(transformed.toJSON());

        if (didChange) {
          changed++;
          // Log changes if verbose
          if (verbose) {
            const transformedJson = transformed.toJSON();
            const diff = computeDiff(original, transformedJson);

            console.log(
              `\n🔄 Changes for Recipe: ${recipe.title} (${recipe._id}):`
            );
            console.log("Changes:");
            console.log(JSON.stringify(diff, null, 2));
          }

          // Save changes if not in debug mode
          if (!debug) {
            await transformed.save();
          }
        }

        processed++;
      } catch (error) {
        console.error(`❌ Error processing recipe ${recipe._id}:`, error);
        errors++;
      }
    }

    // Log summary
    console.log(`\n✅ Batch operation complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total processed: ${processed}`);
    console.log(`   - Changes made: ${changed}`);
    console.log(`   - Errors: ${errors}`);
    if (debug) {
      console.log(`⚠️ DEBUG MODE - No changes were saved to the database`);
    }

    return { processed, changed, errors, debug };
  } catch (error) {
    console.error("❌ Batch operation failed:", error);
    throw error;
  }
}

/**
 * Example usage:
 *
 * // Add a new field to all recipes
 * await batchUpdateRecipes((recipe) => {
 *   recipe.newField = 'default value';
 *   return recipe;
 * }, { debug: true });
 *
 * // Update an existing field on all recipes
 * await batchUpdateRecipes((recipe) => {
 *   recipe.existingField = 'new value';
 *   return recipe;
 * });
 */
