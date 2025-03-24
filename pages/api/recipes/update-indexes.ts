import { NextApiResponse } from "next";
import Recipe from "../models/Recipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

// Define the expected request body shape
interface RecipeUpdate {
  recipeId: string;
  newIndex: number;
  recipeOrder?: number; // Support optional recipeOrder field
}

/**
 * Update recipe indexes in bulk
 * @route POST /api/recipes/update-indexes
 * @access Private
 */
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Connect to database
    await connectDB();

    // Get updates from request body
    const { updates } = req.body as { updates: RecipeUpdate[] };

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: "Invalid updates format" });
    }

    // Process each update
    const results = [];
    for (const update of updates) {
      const { recipeId, newIndex, recipeOrder = newIndex } = update;

      try {
        // Update recipe with both index and recipeOrder for compatibility
        const result = await Recipe.updateOne(
          { _id: recipeId, user: req.user?._id },
          { $set: { index: newIndex, recipeOrder } }
        );

        results.push({
          recipeId,
          success: result.modifiedCount > 0,
          matched: result.matchedCount,
          modified: result.modifiedCount,
        });
      } catch (err) {
        console.error(`Error updating recipe ${recipeId}:`, err);
        results.push({
          recipeId,
          success: false,
          error: "Database error",
        });
      }
    }

    return res.status(200).json({
      message: "Recipe indexes updated",
      results,
    });
  } catch (err) {
    console.error("Error updating recipes:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withProtect(handler);
