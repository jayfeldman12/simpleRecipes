import { NextApiResponse } from "next";
import Recipe from "../models/Recipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

interface RecipeIndexUpdate {
  recipeId: string;
  newIndex: number;
  recipeOrder?: number; // Add support for recipeOrder
}

/**
 * Bulk update recipe indexes
 * @route POST /api/recipes/bulk-update-indexes
 * @access Private
 */
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  console.log("Bulk update indexes request body:", req.body);

  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Connect to database
    await connectDB();

    // Check authentication
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const updates: RecipeIndexUpdate[] = req.body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      console.log("Invalid request data:", req.body);
      return res.status(400).json({ message: "Invalid request data" });
    }

    console.log(`Processing ${updates.length} recipe index updates`);

    // Process each update using direct MongoDB operations
    const updatePromises = updates.map(
      async ({ recipeId, newIndex, recipeOrder = newIndex }) => {
        // Verify the recipe exists and user has permission
        const recipe = await Recipe.findById(recipeId);

        if (!recipe) {
          console.log(`Recipe not found: ${recipeId}`);
          return { recipeId, success: false, error: "Recipe not found" };
        }

        // Check if user owns the recipe
        const isOwner = recipe.user.toString() === req.user?._id.toString();

        if (!isOwner) {
          // Import User model dynamically to avoid circular dependencies
          const User = (await import("../models/User")).default;
          const user = await User.findById(req.user?._id);

          if (!user) {
            return { recipeId, success: false, error: "User not found" };
          }

          const isFavorite = user.favorites.some(
            (favId: any) => favId.toString() === recipeId
          );

          if (!isFavorite) {
            return {
              recipeId,
              success: false,
              error: "Not authorized to reorder this recipe",
            };
          }
        }

        // Update both index and recipeOrder fields for backward compatibility
        const updateResult = await Recipe.updateOne(
          { _id: recipeId },
          {
            $set: {
              index: newIndex, // Keep index for backward compatibility
              recipeOrder: recipeOrder, // Use recipeOrder as the primary field
            },
          }
        );

        console.log(
          `Updated recipe ${recipeId} to index ${newIndex} and recipeOrder ${recipeOrder}:`,
          updateResult
        );

        return {
          recipeId,
          success: updateResult.modifiedCount > 0,
          newIndex,
          recipeOrder,
        };
      }
    );

    const results = await Promise.all(updatePromises);

    // Count successful updates
    const successCount = results.filter((result) => result.success).length;

    return res.status(200).json({
      message: `Successfully updated ${successCount} of ${updates.length} recipe indexes`,
      results,
    });
  } catch (error) {
    console.error("Error updating recipe indexes:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
