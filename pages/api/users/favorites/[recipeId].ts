import mongoose from "mongoose";
import { NextApiResponse } from "next";
import User from "../../../../backend/src/models/User";
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
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // POST - Add to favorites
    if (req.method === "POST") {
      // Check if recipe is already in favorites
      if (user.favorites.some((id) => id.toString() === recipeId)) {
        return res.status(400).json({ message: "Recipe already in favorites" });
      }

      user.favorites.push(new mongoose.Types.ObjectId(recipeId as string));
      await user.save();

      return res.status(200).json({
        message: "Recipe added to favorites",
        favorites: user.favorites,
      });
    }

    // DELETE - Remove from favorites
    if (req.method === "DELETE") {
      // Check if recipe is in favorites
      if (!user.favorites.some((id) => id.toString() === recipeId)) {
        return res.status(400).json({ message: "Recipe not in favorites" });
      }

      user.favorites = user.favorites.filter(
        (id) => id.toString() !== recipeId
      );
      await user.save();

      return res.status(200).json({
        message: "Recipe removed from favorites",
        favorites: user.favorites,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
