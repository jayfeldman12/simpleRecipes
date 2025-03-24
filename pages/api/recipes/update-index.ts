import { NextApiResponse } from "next";
import Recipe from "../models/Recipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

interface UpdateIndexRequest {
  recipeId: string;
  newIndex: number;
}

/**
 * Update a recipe's index and reorder other recipes
 * @route POST /api/recipes/update-index
 * @access Private
 */
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  console.log("Update index request body:", req.body);
  console.log("Request body type:", typeof req.body);

  if (typeof req.body === "string") {
    try {
      req.body = JSON.parse(req.body);
      console.log("Parsed request body:", req.body);
    } catch (e) {
      console.error("Failed to parse request body:", e);
    }
  }

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

    const { recipeId, newIndex } = req.body as UpdateIndexRequest;
    console.log(`Updating recipe ${recipeId} to index ${newIndex}`);

    if (!recipeId || typeof newIndex !== "number") {
      console.log("Invalid request data:", {
        recipeId,
        newIndex,
        typeofNewIndex: typeof newIndex,
      });
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Get the recipe to update
    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
      console.log(`Recipe not found: ${recipeId}`);
      return res.status(404).json({ message: "Recipe not found" });
    }

    console.log("Found recipe:", {
      id: recipe._id,
      title: recipe.title,
      currentIndex: recipe.index,
    });

    // Check if user owns the recipe or if it's in their favorites
    const isOwner = recipe.user.toString() === req.user._id.toString();

    // Import User model dynamically to avoid circular dependencies
    const User = (await import("../models/User")).default;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFavorite = user.favorites.some(
      (favId: any) => favId.toString() === recipeId
    );

    if (!isOwner && !isFavorite) {
      return res.status(403).json({
        message: "Not authorized to reorder this recipe",
      });
    }

    // Get the current index
    const currentIndex = recipe.index || 0;
    console.log(`Current index: ${currentIndex}, New index: ${newIndex}`);

    // If the index hasn't changed, do nothing
    if (currentIndex === newIndex) {
      return res.status(200).json({ message: "Index unchanged" });
    }

    // Update indexes of affected recipes
    if (newIndex > currentIndex) {
      // Moving down: decrement indexes of recipes between current and new position
      const updateResult = await Recipe.updateMany(
        {
          user: isOwner ? req.user._id : recipe.user,
          index: { $gt: currentIndex, $lte: newIndex },
        },
        { $inc: { index: -1 } }
      );
      console.log("Moving down update result:", updateResult);
    } else {
      // Moving up: increment indexes of recipes between new and current position
      const updateResult = await Recipe.updateMany(
        {
          user: isOwner ? req.user._id : recipe.user,
          index: { $gte: newIndex, $lt: currentIndex },
        },
        { $inc: { index: 1 } }
      );
      console.log("Moving up update result:", updateResult);
    }

    // Update the recipe's index using direct MongoDB update to avoid any schema validation issues
    const updateResult = await Recipe.updateOne(
      { _id: recipeId },
      { $set: { index: newIndex } }
    );

    console.log("Recipe index update result:", updateResult);

    // Verify the update
    const updatedRecipe = await Recipe.findById(recipeId);
    console.log("Updated recipe:", {
      id: updatedRecipe._id,
      title: updatedRecipe.title,
      newIndex: updatedRecipe.index,
    });

    return res.status(200).json({
      message: "Recipe index updated successfully",
      recipe: {
        _id: updatedRecipe._id,
        title: updatedRecipe.title,
        index: updatedRecipe.index,
      },
    });
  } catch (error) {
    console.error("Error updating recipe index:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
