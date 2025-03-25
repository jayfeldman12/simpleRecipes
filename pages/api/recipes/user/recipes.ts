import { NextApiResponse } from "next";
import { UserRecipeOrderModel } from "../../models/UserRecipeOrder";
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

    // Fetch recipe order information
    const recipeOrders = await UserRecipeOrderModel.find({
      userId: req.user._id.toString(),
      recipeId: { $in: recipes.map((r: any) => r._id.toString()) },
    });

    // Create a map of recipeId -> order & favorite information
    const orderMap = new Map();
    recipeOrders.forEach((order) => {
      orderMap.set(order.recipeId, {
        order: order.order,
        isFavorite: order.isFavorite,
      });
    });

    // Add isFavorite flag and order to each recipe
    const recipesWithOrderAndFavorite = recipes.map((recipe: any) => {
      const recipeObj = recipe.toJSON();
      const recipeId = recipe._id ? recipe._id.toString() : "";

      // Get order info from map or use defaults
      const orderInfo = orderMap.get(recipeId) || {
        order: null,
        isFavorite: false,
      };

      // Check if this recipe is in the user's favorites (from both sources)
      const isFavoriteFromLegacySystem = favoritesSet.has(recipeId);

      const finalOrder =
        orderInfo.order !== null && orderInfo.order !== undefined
          ? Number(orderInfo.order) // Ensure order is a number
          : Number.MAX_SAFE_INTEGER;

      return {
        ...recipeObj,
        // Use ordering system's favorite flag if available, otherwise fallback to legacy
        isFavorite: orderInfo.isFavorite || isFavoriteFromLegacySystem,
        // Include order information as a number
        order: finalOrder,
      };
    });

    // Log the recipes with their order values for debugging
    console.log(
      "User recipes with orders before sorting:",
      recipesWithOrderAndFavorite.map((r: any) => ({
        id: r._id.toString(),
        title: r.title,
        order: r.order,
        isFavorite: r.isFavorite,
        orderType: typeof r.order,
      }))
    );

    // Sort the recipes by order only
    const sortedRecipes = recipesWithOrderAndFavorite.sort((a: any, b: any) => {
      const aOrder =
        typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder =
        typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;

      return aOrder - bOrder;
    });

    // Log the recipes after sorting for debugging
    console.log(
      "User recipes after sorting:",
      sortedRecipes.map((r: any) => ({
        id: r._id.toString(),
        title: r.title,
        order: r.order,
        isFavorite: r.isFavorite,
      }))
    );

    return res.status(200).json(sortedRecipes);
  } catch (error) {
    console.error("Error fetching user recipes:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
