import { NextApiRequest, NextApiResponse } from "next";
import Recipe from "../../../backend/src/models/Recipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

// Handler for GET requests - Get all recipes
async function getRecipes(req: NextApiRequest, res: NextApiResponse) {
  await connectDB();

  try {
    // Get page from query params or default to 1
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10; // Number of recipes per page
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Recipe.countDocuments();
    const totalPages = Math.ceil(total / limit);

    // Get recipes with pagination
    const recipes = await Recipe.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username");

    return res.status(200).json({
      recipes,
      page,
      pages: totalPages,
      total,
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

// Handler for POST requests - Create a new recipe
async function createRecipe(req: AuthNextApiRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const {
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      servings,
      imageUrl,
      fullRecipe,
      sourceUrl,
    } = req.body;

    // Create a new recipe
    const recipe = new Recipe({
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      servings,
      imageUrl: imageUrl || "default-recipe.jpg",
      user: req.user._id,
      fullRecipe,
      sourceUrl,
    });

    // Save to database
    const savedRecipe = await recipe.save();
    return res.status(201).json(savedRecipe);
  } catch (error) {
    console.error("Error creating recipe:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

// Main handler function
export default async function handler(
  req: NextApiRequest | AuthNextApiRequest,
  res: NextApiResponse
) {
  // Connect to the database
  await connectDB();

  try {
    // Route handlers based on HTTP method
    if (req.method === "GET") {
      // GET is a public route, no authentication needed
      return getRecipes(req, res);
    } else if (req.method === "POST") {
      // POST requires authentication
      return withProtect(createRecipe as any)(req as AuthNextApiRequest, res);
    } else {
      return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in recipes API:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
