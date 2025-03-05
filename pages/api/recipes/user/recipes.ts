import { NextApiResponse } from "next";
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

    // Get user's recipes
    const recipes = await Recipe.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json(recipes);
  } catch (error) {
    console.error("Error fetching user recipes:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
