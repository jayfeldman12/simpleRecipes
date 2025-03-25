import mongoose from "mongoose";
import { NextApiResponse } from "next";
import { getUserRecipeOrderModel } from "../../../src/models/UserRecipeOrder";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

interface RecipeOrderUpdate {
  recipeId: string;
  order: number;
  isFavorite?: boolean;
  recipeType?: string;
}

/**
 * Update user recipe orders
 * @route POST /api/recipes/update-user-recipe-orders
 * @access Private
 */
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  console.log("Starting update-user-recipe-orders handler");

  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check authentication
    console.log("Checking authentication, user:", req.user);

    if (!req.user || !req.user._id) {
      console.error("Authentication failed - no user or user ID");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user._id;
    console.log("User ID:", userId);

    // Validate request body
    const { updates } = req.body as { updates: RecipeOrderUpdate[] };
    if (!updates || !Array.isArray(updates)) {
      console.error("Invalid request body:", req.body);
      return res
        .status(400)
        .json({ message: "Invalid request: updates array required" });
    }

    console.log("Updates to process:", updates);

    // Connect to database
    await connectDB();

    // Get UserRecipeOrder model
    const UserRecipeOrder = getUserRecipeOrderModel();

    // Process each update
    const results = [];
    for (const update of updates) {
      try {
        const { recipeId, order, isFavorite, recipeType } = update;

        if (!recipeId) {
          results.push({ success: false, error: "Missing recipeId", update });
          continue;
        }

        console.log(`Processing update for recipe ${recipeId}, order ${order}`);

        // Create or update the user recipe order
        const result = await UserRecipeOrder.findOneAndUpdate(
          {
            userId: new mongoose.Types.ObjectId(userId),
            recipeId: new mongoose.Types.ObjectId(recipeId),
          },
          {
            $set: {
              order: order !== undefined ? order : 0,
              isFavorite: isFavorite !== undefined ? isFavorite : false,
              recipeType: recipeType || "own",
              updatedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        console.log("Update result:", result);
        results.push({ success: true, recipeId, result });
      } catch (error) {
        console.error("Error updating user recipe order:", error);
        results.push({ success: false, error: String(error), update });
      }
    }

    console.log("All updates processed, results:", results);
    return res.status(200).json({ message: "Update successful", results });
  } catch (error) {
    console.error("Error updating user recipe orders:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: String(error) });
  }
}

export default withProtect(handler);
