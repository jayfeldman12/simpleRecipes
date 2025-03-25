import { NextApiResponse } from "next";
import { UserRecipeOrderModel } from "../../models/UserRecipeOrder";
import { AuthNextApiRequest, connectDB, withProtect } from "../../utils/auth";

// @desc    Add or remove recipe from favorites
// @route   POST/DELETE /api/users/favorites/:recipeId
// @access  Private
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  // Connect to the database
  await connectDB();

  // Only allow POST and DELETE methods for this endpoint
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { recipeId } = req.query;
    const userId = req.user._id.toString();

    // POST - Add to favorites
    if (req.method === "POST") {
      // Check if recipe order entry exists
      let recipeOrder = await UserRecipeOrderModel.findOne({
        userId,
        recipeId: recipeId as string,
      });

      if (recipeOrder) {
        // Update existing entry
        if (recipeOrder.isFavorite) {
          return res
            .status(400)
            .json({ message: "Recipe already in favorites" });
        }

        recipeOrder.isFavorite = true;
        await recipeOrder.save();
      } else {
        // Create new entry
        // Get max existing order to place this at the end
        const maxOrderRecord = await UserRecipeOrderModel.findOne({
          userId,
        }).sort({ order: -1 });

        const nextOrder = maxOrderRecord ? maxOrderRecord.order + 1 : 0;

        recipeOrder = await UserRecipeOrderModel.create({
          userId,
          recipeId: recipeId as string,
          isFavorite: true,
          order: nextOrder,
        });
      }

      console.log(
        `Added recipe ${recipeId} to favorites with order ${recipeOrder.order}`
      );

      return res.status(200).json({
        message: "Recipe added to favorites",
        order: recipeOrder.order,
        isFavorite: recipeOrder.isFavorite,
      });
    }

    // DELETE - Remove from favorites
    if (req.method === "DELETE") {
      // Find the recipe order entry
      const recipeOrder = await UserRecipeOrderModel.findOne({
        userId,
        recipeId: recipeId as string,
      });

      if (!recipeOrder || !recipeOrder.isFavorite) {
        return res.status(400).json({ message: "Recipe not in favorites" });
      }

      // Update the entry to mark as unfavorited
      recipeOrder.isFavorite = false;
      await recipeOrder.save();

      console.log(`Removed recipe ${recipeId} from favorites`);

      return res.status(200).json({
        message: "Recipe removed from favorites",
        order: recipeOrder.order,
        isFavorite: recipeOrder.isFavorite,
      });
    }
  } catch (error) {
    console.error("Error updating favorites:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
