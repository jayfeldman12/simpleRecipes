import { NextApiResponse } from "next";
import { UserRecipeOrderModel } from "../models/UserRecipeOrder";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

// @desc    Migrate all favorites from user.favorites array to UserRecipeOrder
// @route   POST /api/recipes/migrate-favorites
// @access  Private
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  // Connect to the database
  await connectDB();

  // Only allow POST method for this endpoint
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Import User model dynamically to avoid circular dependencies
    const User = (await import("../models/User")).default;

    // Get user with populated favorites
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get existing favorites from UserRecipeOrder model
    const existingOrders = await UserRecipeOrderModel.find({
      userId: req.user._id.toString(),
      isFavorite: true,
    });

    const existingFavoriteIds = new Set(
      existingOrders.map((order) => order.recipeId)
    );

    // Get max existing order to start adding new orders after
    const maxOrderRecord = await UserRecipeOrderModel.findOne({
      userId: req.user._id.toString(),
      isFavorite: true,
    }).sort({ order: -1 });

    let nextOrder = maxOrderRecord ? maxOrderRecord.order + 1 : 0;

    // Convert legacy favorites to strings for comparison
    const legacyFavoriteIds = user.favorites.map((id: any) => id.toString());

    // Count of migrated favorites
    let migratedCount = 0;

    // Migrate each legacy favorite that isn't already in the new system
    for (const recipeId of legacyFavoriteIds) {
      if (!existingFavoriteIds.has(recipeId)) {
        // Create new UserRecipeOrder entry with order at the end of favorites
        await UserRecipeOrderModel.create({
          userId: req.user._id.toString(),
          recipeId,
          isFavorite: true,
          order: nextOrder++,
        });
        migratedCount++;
      }
    }

    // Optionally: Clear the old favorites array
    // user.favorites = [];
    // await user.save();

    return res.status(200).json({
      message: `Successfully migrated ${migratedCount} favorites`,
      totalLegacyFavorites: legacyFavoriteIds.length,
      totalExistingFavorites: existingFavoriteIds.size,
      migratedCount,
    });
  } catch (error) {
    console.error("Error migrating favorites:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
