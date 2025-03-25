import { NextApiResponse } from "next";
import { UserRecipeOrderModel } from "../../models/UserRecipeOrder";
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

    // Import Recipe model dynamically
    const Recipe = (await import("../../models/Recipe")).default;

    // Get favorite recipe IDs from the UserRecipeOrder model
    const favoriteOrders = await UserRecipeOrderModel.find({
      userId: req.user._id.toString(),
      isFavorite: true,
    });

    const favoriteRecipeIds = favoriteOrders.map((order) => order.recipeId);

    if (favoriteRecipeIds.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch the full recipe details for each favorite recipe
    const favoriteRecipes = await Recipe.find({
      _id: { $in: favoriteRecipeIds },
    })
      .sort({ createdAt: -1 })
      .populate("user", "username");

    // Create a map of recipe ID to order
    const orderMap = new Map();
    favoriteOrders.forEach((order) => {
      orderMap.set(order.recipeId, order.order);
    });

    // Add user-specific data to each recipe
    const recipesWithUserData = favoriteRecipes.map((recipe: any) => {
      const userData = orderMap.get(recipe._id.toString()) || {
        isFavorite: false,
        order: Number.MAX_SAFE_INTEGER,
      };

      return {
        ...recipe.toObject(),
        isFavorite: userData.isFavorite,
        order: userData.order,
      };
    });

    // Sort recipes by order only
    const sortedRecipes = recipesWithUserData.sort(
      (a: { order: number }, b: { order: number }) => a.order - b.order
    );

    return res.status(200).json(sortedRecipes);
  } catch (error) {
    console.error("Error fetching favorite recipes:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
