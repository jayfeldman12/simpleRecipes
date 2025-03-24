import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { getUserRecipeOrderModel } from "../../../src/models/UserRecipeOrder";
import { connectDB } from "../../utils/database";

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
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check authentication
    const session = await getSession({ req });
    if (!session || !session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = session.user.id;

    // Validate request body
    const { updates } = req.body as { updates: RecipeOrderUpdate[] };
    if (!updates || !Array.isArray(updates)) {
      return res
        .status(400)
        .json({ message: "Invalid request: updates array required" });
    }

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

        // Create or update the user recipe order
        const result = await UserRecipeOrder.findOneAndUpdate(
          { userId, recipeId },
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

        results.push({ success: true, recipeId, result });
      } catch (error) {
        console.error("Error updating user recipe order:", error);
        results.push({ success: false, error: String(error), update });
      }
    }

    return res.status(200).json({ message: "Update successful", results });
  } catch (error) {
    console.error("Error updating user recipe orders:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: String(error) });
  }
}
