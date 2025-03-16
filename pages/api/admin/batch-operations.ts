import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { IngredientType, InstructionItem } from "../../../src/types/recipe";
import { IRecipeDocument } from "../models/types";
import { fetchHtmlFromUrl } from "../services/htmlFetchService";
import { extractRecipeFromHTML } from "../services/openaiService";
import { processImageUrl } from "../utils/awsS3";
import {
  backfillRecipeIndexes,
  BatchOperationResult,
  batchUpdateRecipes,
  RecipeTransformFn,
} from "../utils/batchOperations";

// Types for the request body
interface BatchOperationRequest {
  operation: string;
  debug?: boolean;
}

// Secure API key validation using constant-time comparison to prevent timing attacks
function validateApiKey(providedKey: string): boolean {
  // The API key should be stored in environment variables
  const apiKey = process.env.BATCH_OPERATIONS_API_KEY;

  if (!apiKey || !providedKey) {
    return false;
  }

  // Use crypto's timingSafeEqual to prevent timing attacks
  try {
    // Convert both keys to Buffer objects of the same length
    const apiKeyBuffer = Buffer.from(apiKey);
    const providedKeyBuffer = Buffer.from(providedKey);

    // Compare using constant-time algorithm to prevent timing attacks
    return crypto.timingSafeEqual(apiKeyBuffer, providedKeyBuffer);
  } catch (error) {
    console.error("Error validating API key:", error);
    return false;
  }
}

// Registry of available transform functions
const operations: Record<string, RecipeTransformFn | (() => Promise<void>)> = {
  "add-test-field": (recipe: IRecipeDocument) => {
    // Use type assertion to allow adding dynamic property
    interface RecipeWithTestField extends IRecipeDocument {
      testField?: string;
    }
    (recipe as RecipeWithTestField).testField = "This is a test field";
    return recipe;
  },

  "add-timestamps": (recipe: IRecipeDocument, index: number) => {
    const now = new Date();
    console.log("checking recipe", recipe.title, index);

    // Helper function to check if a value is a valid date
    const isValidDate = (value: unknown): boolean => {
      if (!value) return false;

      // Handle string dates
      if (typeof value === "string") {
        try {
          const date = new Date(value);
          return !isNaN(date.getTime());
        } catch (e) {
          return false;
        }
      }

      // Handle Date objects
      if (value instanceof Date) {
        return !isNaN(value.getTime());
      }

      return false;
    };

    // Helper function to ensure value is a Date object
    const ensureDate = (value: string | Date | undefined): Date => {
      if (!value) {
        return new Date(); // Default to current date if undefined
      }
      if (typeof value === "string") {
        return new Date(value);
      }
      return value;
    };

    // Check if createdAt exists and is valid, otherwise set to current time
    if (!isValidDate(recipe.createdAt)) {
      recipe.createdAt = now;
    } else {
      // Ensure it's a Date object
      recipe.createdAt = ensureDate(recipe.createdAt);
    }

    // Check if updatedAt exists and is valid, otherwise set to current time
    if (!isValidDate(recipe.updatedAt)) {
      recipe.updatedAt = now;
    } else {
      // Ensure it's a Date object
      recipe.updatedAt = ensureDate(recipe.updatedAt);
    }

    return recipe;
  },

  "fix-image-urls": async (recipe: IRecipeDocument) => {
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

    if (!cloudfrontDomain) {
      console.error("AWS_CLOUDFRONT_DOMAIN environment variable is not set");
      return recipe;
    }

    // Only process recipes with an imageUrl that isn't already a Cloudfront URL
    if (
      recipe.imageUrl &&
      typeof recipe.imageUrl === "string" &&
      !recipe.imageUrl.includes(cloudfrontDomain) &&
      recipe.imageUrl !== "default-recipe.jpg"
    ) {
      console.log(`Processing image for recipe: ${recipe.title}`);
      console.log(`Original imageUrl: ${recipe.imageUrl}`);

      try {
        // Save original URL if not already saved
        if (!recipe.originalImageUrl) {
          recipe.originalImageUrl = recipe.imageUrl;
        }

        // Process the image - this will download it and upload to S3
        const processedImageUrl = await processImageUrl(recipe.imageUrl);

        // Update the imageUrl if processing was successful
        if (processedImageUrl && processedImageUrl.includes(cloudfrontDomain)) {
          console.log(`Updated imageUrl: ${processedImageUrl}`);
          recipe.imageUrl = processedImageUrl;
        } else {
          console.log(`Image processing failed, keeping original URL`);
        }
      } catch (error) {
        console.error(
          `Error processing image for recipe ${recipe._id}:`,
          error
        );
      }
    } else {
      console.log(
        `Skipping recipe ${recipe.title} - image already processed or no image`
      );
    }

    return recipe;
  },

  "structure-ingredients-instructions": async (recipe: IRecipeDocument) => {
    // Skip if the recipe already has structured ingredients and instructions
    const hasStructuredIngredients = recipe.ingredients.some(
      (
        ingredient:
          | string
          | IngredientType
          | { sectionTitle: string; ingredients: IngredientType[] }
      ) => typeof ingredient !== "string"
    );
    const hasStructuredInstructions = recipe.instructions.some(
      (instruction: string | { text: string }) =>
        typeof instruction === "object" && "text" in instruction
    );

    // If already structured, skip processing
    if (hasStructuredIngredients && hasStructuredInstructions) {
      console.log(
        `Recipe ${recipe.title} already has structured data, skipping`
      );
      return recipe;
    }

    console.log(`Processing recipe ${recipe.title} for structured data`);

    try {
      // If we have a source URL, fetch the HTML and extract structured data
      if (recipe.sourceUrl) {
        console.log(`Fetching content from source: ${recipe.sourceUrl}`);
        const htmlContent = await fetchHtmlFromUrl(recipe.sourceUrl);

        if (htmlContent) {
          console.log(`Successfully fetched HTML, extracting structured data`);
          const structuredData = await extractRecipeFromHTML(
            htmlContent,
            recipe.sourceUrl
          );

          if (structuredData) {
            console.log(
              `Successfully extracted structured data for ${recipe.title}`
            );

            // Update ingredients if they're not already structured
            if (!hasStructuredIngredients && structuredData.ingredients) {
              recipe.ingredients = structuredData.ingredients;
              console.log(`Updated ingredients to structured format`);
            }

            // Update instructions if they're not already structured
            if (!hasStructuredInstructions && structuredData.instructions) {
              recipe.instructions = structuredData.instructions;
              console.log(`Updated instructions to structured format`);
            }

            return recipe;
          }
        }
      }

      // Fallback if source URL doesn't work: convert existing ingredients and instructions
      console.log(
        `Using fallback method to structure data for ${recipe.title}`
      );

      // Convert string ingredients to objects
      recipe.ingredients = recipe.ingredients.map(
        (ingredient: string | IngredientType) => {
          if (typeof ingredient === "string") {
            return { text: ingredient.trim(), optional: false };
          }
          return ingredient;
        }
      );

      // Convert string instructions to objects
      recipe.instructions = recipe.instructions.map(
        (instruction: string | InstructionItem) => {
          if (typeof instruction === "string") {
            return { text: instruction.trim() };
          }
          return instruction;
        }
      );

      return recipe;
    } catch (error) {
      console.error(
        `Error processing structured data for ${recipe.title}:`,
        error
      );

      // If any error occurs, still ensure we return a structured format
      if (!hasStructuredIngredients) {
        recipe.ingredients = recipe.ingredients.map(
          (ingredient: string | IngredientType) =>
            typeof ingredient === "string"
              ? { text: ingredient, optional: false }
              : ingredient
        );
      }

      if (!hasStructuredInstructions) {
        recipe.instructions = recipe.instructions.map(
          (instruction: string | InstructionItem) =>
            typeof instruction === "string"
              ? { text: instruction }
              : instruction
        );
      }

      return recipe;
    }
  },

  "backfill-recipe-indexes": async (recipe: IRecipeDocument) => {
    // This is a placeholder function that won't be used directly
    // The actual backfill is handled separately
    return recipe;
  },
};

/**
 * API handler for batch operations
 * Execute with Postman or similar tool:
 *
 * POST /api/admin/batch-operations
 * Headers:
 *   X-API-Key: your-api-key
 *   Content-Type: application/json
 * Body:
 *   {
 *     "operation": "add-timestamps",
 *     "debug": true
 *   }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Validate API key
  const apiKey = req.headers["x-api-key"] as string;
  if (!validateApiKey(apiKey)) {
    // Use a generic error message to not disclose if API key is wrong or missing
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const { operation, debug = true } = req.body as BatchOperationRequest;

    if (!operation || typeof operation !== "string") {
      return res.status(400).json({ message: "Invalid operation" });
    }

    // Special handling for backfill-recipe-indexes operation
    if (operation === "backfill-recipe-indexes") {
      try {
        await backfillRecipeIndexes();
        return res.status(200).json({
          message: "Recipe index backfill completed successfully",
          debug,
        });
      } catch (error) {
        console.error("Error during backfill:", error);
        return res.status(500).json({
          message: "Error during recipe index backfill",
          error:
            process.env.NODE_ENV === "development" ? String(error) : undefined,
        });
      }
    }

    // Get the operation function from the registry
    const operationFn = operations[operation];
    if (!operationFn) {
      return res.status(400).json({
        message: "Unknown operation",
        availableOperations: Object.keys(operations),
      });
    }

    // Execute the batch operation
    const result: BatchOperationResult = await batchUpdateRecipes(
      operationFn as RecipeTransformFn,
      {
        debug,
      }
    );

    return res.status(200).json({
      message: `Batch operation '${operation}' completed successfully`,
      result,
      debug,
    });
  } catch (error) {
    console.error("Error in batch operation:", error);
    return res.status(500).json({
      message: "Server error during batch operation",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
