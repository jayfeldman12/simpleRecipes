import { NextApiResponse } from "next";
import { UserRecipeOrderModel } from "../../models/UserRecipeOrder";
import { AuthNextApiRequest, withProtect } from "../../utils/auth";
import dbConnect from "../../utils/dbConnect";

async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await dbConnect();

    // Check if we're updating a single recipe or batch updating
    if (req.body.recipeId) {
      // Single recipe update
      const { recipeId, order, isFavorite } = req.body;

      if (!recipeId || (order === undefined && isFavorite === undefined)) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if the document already exists
      const existingOrder = await UserRecipeOrderModel.findOne({
        userId: req.user._id.toString(),
        recipeId: recipeId,
      });

      let userRecipeOrder;

      if (existingOrder) {
        // If we're updating the order, shift other orders
        if (order !== undefined && order !== existingOrder.order) {
          // Get all recipes that need to be shifted
          const recipesToShift = await UserRecipeOrderModel.find({
            userId: req.user._id.toString(),
            order: {
              $gte: Math.min(order, existingOrder.order),
              $lte: Math.max(order, existingOrder.order),
            },
            _id: { $ne: existingOrder._id }, // Exclude the current recipe
          });

          // Shift orders up or down
          const shiftAmount = order < existingOrder.order ? 1 : -1;
          for (const recipe of recipesToShift) {
            await UserRecipeOrderModel.findByIdAndUpdate(recipe._id, {
              $inc: { order: shiftAmount },
            });
          }
        }

        // Update existing document
        const updateData: { order?: number; isFavorite?: boolean } = {};
        if (order !== undefined) updateData.order = order;
        if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

        userRecipeOrder = await UserRecipeOrderModel.findOneAndUpdate(
          {
            userId: req.user._id.toString(),
            recipeId: recipeId,
          },
          { $set: updateData },
          { new: true }
        );
      } else {
        // For new favorites, add to the end of the favorites list
        if (isFavorite) {
          // Get the highest order among favorites
          const maxOrderRecord = await UserRecipeOrderModel.findOne({
            userId: req.user._id.toString(),
            isFavorite: true,
          }).sort({ order: -1 });

          const nextOrder = maxOrderRecord ? maxOrderRecord.order + 1 : 0;

          // Create new entry at the end of favorites
          userRecipeOrder = await UserRecipeOrderModel.create({
            userId: req.user._id.toString(),
            recipeId,
            isFavorite: true,
            order: nextOrder,
          });
        } else {
          // For non-favorites, create with default order
          userRecipeOrder = await UserRecipeOrderModel.create({
            userId: req.user._id.toString(),
            recipeId,
            order: order ?? 0,
            isFavorite: false,
          });
        }
      }

      return res.status(200).json(userRecipeOrder);
    } else if (req.body.recipes && Array.isArray(req.body.recipes)) {
      // Batch update of multiple recipes
      const { recipes } = req.body;
      const userId = req.user._id.toString();
      const result = [];

      // Process each recipe update in the batch
      for (const recipeUpdate of recipes) {
        const { recipeId, order, isFavorite } = recipeUpdate;

        if (!recipeId) continue;

        const updateData: { order?: number; isFavorite?: boolean } = {};
        if (order !== undefined) updateData.order = order;
        if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

        // Skip if no fields to update
        if (Object.keys(updateData).length === 0) continue;

        try {
          // Check if document exists first
          const existing = await UserRecipeOrderModel.findOne({
            userId,
            recipeId,
          });

          if (existing) {
            // Update existing document
            const updated = await UserRecipeOrderModel.findOneAndUpdate(
              { userId, recipeId },
              { $set: updateData },
              { new: true }
            );
            result.push(updated);
          } else {
            // Create new document
            const newOrder = await UserRecipeOrderModel.create({
              userId,
              recipeId,
              order: order ?? 0,
              isFavorite: isFavorite ?? false,
            });
            result.push(newOrder);
          }
        } catch (error) {
          console.error(`Error updating recipe ${recipeId}:`, error);
          continue;
        }
      }

      return res.status(200).json(result);
    } else {
      return res.status(400).json({ message: "Invalid request format" });
    }
  } catch (error) {
    console.error("Error updating user recipe order:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default withProtect(handler);
