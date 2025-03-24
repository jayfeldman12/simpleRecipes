import mongoose from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import { getUserRecipeOrderModel } from "../../../src/models/UserRecipeOrder";
import { connectDB } from "../../utils/database";

/**
 * Backfill user recipe orders in the join table
 * @route POST /api/admin/backfill-user-recipe-orders
 * @access Admin only
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Connect to database
    await connectDB();

    // Get database connection
    const db = mongoose.connection;

    console.log("Starting backfill of user recipe orders...");

    // Get the UserRecipeOrder model
    const UserRecipeOrder = getUserRecipeOrderModel();

    // Start with clean slate - remove existing user recipe orders
    // Warning: This will delete all existing user recipe orders!
    const deleteResult = await UserRecipeOrder.deleteMany({});
    console.log(
      `Deleted ${deleteResult.deletedCount} existing user recipe orders`
    );

    // Get the Recipe and Favorite collections
    const RecipeCollection = db.collection("recipes");
    const FavoriteCollection = db.collection("favorites");

    // Get all users
    const usersCollection = db.collection("users");
    const users = await usersCollection.find({}).toArray();
    console.log(`Processing ${users.length} users`);

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each user
    for (const user of users) {
      const userId = user._id;

      try {
        // Step 1: Process user's own recipes
        const userRecipes = await RecipeCollection.find({
          user: userId,
        }).toArray();
        console.log(
          `User ${userId}: Processing ${userRecipes.length} own recipes`
        );

        // Sort recipes by creation date (newest first)
        userRecipes.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Create user recipe orders for own recipes
        for (let i = 0; i < userRecipes.length; i++) {
          try {
            await UserRecipeOrder.create({
              userId,
              recipeId: userRecipes[i]._id,
              order: i,
              isFavorite: false,
              recipeType: "own",
              createdAt: new Date(),
            });
            totalProcessed++;
          } catch (error) {
            console.error(
              `Error creating user recipe order for recipe ${userRecipes[i]._id}:`,
              error
            );
            totalErrors++;
          }
        }

        // Step 2: Process user's favorite recipes
        const userFavorites = await FavoriteCollection.find({
          user: userId,
        }).toArray();
        console.log(
          `User ${userId}: Processing ${userFavorites.length} favorite recipes`
        );

        // Get recipe details for favorites
        const favoriteRecipeIds = userFavorites.map((fav) => fav.recipe);
        const favoriteRecipes = await RecipeCollection.find({
          _id: { $in: favoriteRecipeIds },
        }).toArray();

        // Sort favorite recipes by creation date (newest first)
        favoriteRecipes.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Create user recipe orders for favorite recipes
        for (let i = 0; i < favoriteRecipes.length; i++) {
          try {
            const fav = userFavorites.find(
              (f) => f.recipe.toString() === favoriteRecipes[i]._id.toString()
            );

            await UserRecipeOrder.create({
              userId,
              recipeId: favoriteRecipes[i]._id,
              order: i,
              isFavorite: true,
              recipeType: "favorite",
              createdAt: fav?.createdAt || new Date(),
            });
            totalProcessed++;
          } catch (error) {
            console.error(
              `Error creating user recipe order for favorite recipe ${favoriteRecipes[i]._id}:`,
              error
            );
            totalErrors++;
          }
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        totalErrors++;
      }
    }

    // Verify the updates
    const totalUserRecipeOrders = await UserRecipeOrder.countDocuments();

    return res.status(200).json({
      message: "Backfill completed",
      totalUsers: users.length,
      totalProcessed,
      totalErrors,
      totalUserRecipeOrders,
    });
  } catch (error) {
    console.error("Error backfilling user recipe orders:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: String(error) });
  }
}
