import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { getUserRecipeOrderModel } from "../../../src/models/UserRecipeOrder";
import { connectDB } from "../../utils/database";

/**
 * Get user recipe orders
 * @route GET /api/recipes/get-user-recipe-orders
 * @access Private
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET method
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check authentication
    const session = await getSession({ req });
    if (!session || !session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = session.user.id;

    // Optional recipe type filter
    const { recipeType } = req.query;

    // Connect to database
    await connectDB();

    // Get UserRecipeOrder model
    const UserRecipeOrder = getUserRecipeOrderModel();

    // Build query
    const query: { userId: string; recipeType?: string } = { userId };
    if (recipeType && typeof recipeType === "string") {
      query.recipeType = recipeType;
    }

    // Get user recipe orders
    const userRecipeOrders = await UserRecipeOrder.find(query).sort({
      order: 1,
    });

    // Transform to map for easier client consumption
    const userRecipeOrdersMap: Record<
      string,
      {
        order: number;
        isFavorite: boolean;
        recipeType: string;
        createdAt: Date;
      }
    > = {};
    userRecipeOrders.forEach((order) => {
      const recipeId = order.recipeId.toString();
      userRecipeOrdersMap[recipeId] = {
        order: order.order,
        isFavorite: order.isFavorite,
        recipeType: order.recipeType,
        createdAt: order.createdAt,
      };
    });

    return res.status(200).json({ userRecipeOrders: userRecipeOrdersMap });
  } catch (error) {
    console.error("Error getting user recipe orders:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: String(error) });
  }
}
