import { NextApiResponse } from "next";
import { AuthNextApiRequest, connectDB, withProtect } from "../../utils/auth";

// @desc    Get user's recipes
// @route   GET /api/recipes/user/recipes
// @access  Private
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  // Connect to the database
  await connectDB();

  // Only allow GET method for this endpoint
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Import Recipe model dynamically
    const Recipe = (await import("../../models/Recipe")).default;
    // Import User model dynamically
    const User = (await import("../../models/User")).default;

    // Get user with favorites
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert user favorites to a Set for faster lookups
    const favoritesSet = new Set(
      user.favorites.map((id: any) => id.toString())
    );

    // Get user's recipes
    const recipes = await Recipe.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    // Add isFavorite flag to each recipe
    const recipesWithFavoriteFlag = recipes.map((recipe: any) => {
      const recipeObj = recipe.toJSON();
      const recipeId = recipe._id ? recipe._id.toString() : "";

      // Check if this recipe is in the user's favorites
      return {
        ...recipeObj,
        isFavorite: favoritesSet.has(recipeId),
      };
    });

    return res.status(200).json(recipesWithFavoriteFlag);
  } catch (error) {
    console.error("Error fetching user recipes:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
