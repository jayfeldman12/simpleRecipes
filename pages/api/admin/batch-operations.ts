import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { IRecipeDocument } from "../models/types";
import {
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
const operations: Record<string, RecipeTransformFn> = {
  "add-test-field": (recipe: IRecipeDocument) => {
    // Use type assertion to allow adding dynamic property
    (recipe as any).testField = "This is a test field";
    return recipe;
  },

  "add-timestamps": (recipe: IRecipeDocument, index: number) => {
    const now = new Date();
    console.log("checking recipe", recipe.title, index);

    // Helper function to check if a value is a valid date
    const isValidDate = (value: any): boolean => {
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
    const ensureDate = (value: any): Date => {
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

  // Get API key from headers
  const apiKey = req.headers["x-api-key"] as string;

  // Validate API key
  if (!validateApiKey(apiKey)) {
    // Use a generic error message to not disclose if API key is wrong or missing
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const { operation, debug = true } = req.body as BatchOperationRequest;

    if (!operation || typeof operation !== "string") {
      return res.status(400).json({ message: "Invalid operation" });
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
    const result: BatchOperationResult = await batchUpdateRecipes(operationFn, {
      debug,
    });

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
