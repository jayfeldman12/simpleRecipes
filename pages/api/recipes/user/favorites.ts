import { NextApiResponse } from "next";
import Recipe from "../../../../backend/src/models/Recipe";
import User from "../../../../backend/src/models/User";
import { AuthNextApiRequest, connectDB, withProtect } from "../../utils/auth";

// @desc    Get favorite recipes
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

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favoriteRecipes = await Recipe.find({
      _id: { $in: user.favorites },
    }).sort({ createdAt: -1 });

    return res.status(200).json(favoriteRecipes);
  } catch (error) {
    console.error("Error fetching favorite recipes:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
