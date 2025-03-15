import { NextApiResponse } from "next";
import { AuthNextApiRequest, connectDB, withProtect } from "../../utils/auth";

// @desc    Get user's favorite recipes
// @route   GET /api/recipes/user/favorites
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

    // Import User model dynamically to avoid circular dependencies
    const User = (await import("../../models/User")).default;
    // Import Recipe model dynamically
    const Recipe = (await import("../../models/Recipe")).default;

    // Get user with populated favorites
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch the full recipe details for each favorite
    const favoriteRecipes = await Recipe.find({
      _id: { $in: user.favorites },
    })
      .sort({ index: 1 })
      .populate("user", "username");

    // Add isFavorite flag to each recipe
    const recipesWithFavoriteFlag = favoriteRecipes.map((recipe: any) => {
      const recipeObj = recipe.toJSON();
      return {
        ...recipeObj,
        isFavorite: true,
      };
    });

    return res.status(200).json(recipesWithFavoriteFlag);
  } catch (error) {
    console.error("Error fetching favorite recipes:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
