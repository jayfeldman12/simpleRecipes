import { NextApiRequest, NextApiResponse } from "next";
import Recipe from "../models/Recipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

// Handler for GET requests - Get all recipes
async function getRecipes(
  req: AuthNextApiRequest | NextApiRequest,
  res: NextApiResponse
) {
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

    // If user is authenticated, check which recipes are in their favorites
    let recipesWithFavorites = recipes;

    if ("user" in req && req.user) {
      // Import User model dynamically to avoid circular dependencies
      const User = (await import("../models/User")).default;

      // Get user with favorites
      const user = await User.findById(req.user._id);

      if (user) {
        // Convert user favorites to string IDs for comparison
        const favoritesSet = new Set(user.favorites.map((id) => id.toString()));

        // Create a new array with the isFavorite flag added
        const recipeObjects = recipes.map((recipe) => {
          // Convert Mongoose document to plain object
          const recipeObj = recipe.toJSON();
          const recipeId = recipe._id ? recipe._id.toString() : "";

          // Check if this recipe is in the user's favorites
          const isFavorite = favoritesSet.has(recipeId);

          // Add isFavorite flag
          return {
            ...recipeObj,
            isFavorite: isFavorite,
          };
        });

        // Log the entire response for debugging
        console.log(
          "Response with favorites:",
          recipeObjects.map((r) => ({
            id: r._id,
            title: r.title,
            isFavorite: r.isFavorite,
          }))
        );

        // Return the new array with the isFavorite flag
        return res.status(200).json({
          recipes: recipeObjects,
          page,
          pages: totalPages,
          total,
        });
      }
    }

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
      ingredients: rawIngredients,
      instructions,
      cookingTime,
      cookTimeMinutes,
      prepTimeMinutes,
      servings,
      imageUrl,
      fullRecipe,
      sourceUrl,
    } = req.body;

    // Process ingredients if they're in the frontend format
    let processedIngredients = rawIngredients;
    if (
      Array.isArray(rawIngredients) &&
      rawIngredients.length > 0 &&
      typeof rawIngredients[0] === "object"
    ) {
      processedIngredients = rawIngredients.map(
        (ing) => `${ing.amount ? ing.amount + " " : ""}${ing.name}`
      );
    }

    // Create a new recipe
    const recipe = new Recipe({
      title,
      description,
      ingredients: processedIngredients,
      instructions,
      cookingTime: cookTimeMinutes || cookingTime, // Use either format
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
      // GET is a public route, but we'll pass auth info if available
      return withProtect(getRecipes as any, true)(
        req as AuthNextApiRequest,
        res
      );
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
