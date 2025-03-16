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

    if (!recipeId || typeof newIndex !== "number") {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Get the recipe to update
    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

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

    // If the index hasn't changed, do nothing
    if (currentIndex === newIndex) {
      return res.status(200).json({ message: "Index unchanged" });
    }

    // Update indexes of affected recipes
    if (newIndex > currentIndex) {
      // Moving down: decrement indexes of recipes between current and new position
      await Recipe.updateMany(
        {
          user: isOwner ? req.user._id : recipe.user,
          index: { $gt: currentIndex, $lte: newIndex },
        },
        { $inc: { index: -1 } }
      );
    } else {
      // Moving up: increment indexes of recipes between new and current position
      await Recipe.updateMany(
        {
          user: isOwner ? req.user._id : recipe.user,
          index: { $gte: newIndex, $lt: currentIndex },
        },
        { $inc: { index: 1 } }
      );
    }

    // Update the recipe's index
    recipe.index = newIndex;
    await recipe.save();

    return res.status(200).json({
      message: "Recipe index updated successfully",
      recipe: {
        _id: recipe._id,
        title: recipe.title,
        index: recipe.index,
      },
    });
  } catch (error) {
    console.error("Error updating recipe index:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
