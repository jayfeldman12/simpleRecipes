import { NextApiRequest, NextApiResponse } from "next";
import Recipe from "../models/Recipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";
import { processImageUrl } from "../utils/awsS3";

// Handler for GET requests - Get all recipes
async function getRecipes(
  req: AuthNextApiRequest | NextApiRequest,
  res: NextApiResponse
) {
  await connectDB();

  try {
    // Check if the request includes a "all" parameter
    const showAll = req.query.all === "true";

    // Get page from query params or default to 1
    const page = parseInt(req.query.page as string) || 1;
    const limit = showAll ? 0 : 10; // Number of recipes per page, 0 means no limit
    const skip = showAll ? 0 : (page - 1) * limit;

    // Get total count for pagination
    const total = await Recipe.countDocuments();
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    // Build query
    let recipesQuery = Recipe.find().sort({ createdAt: -1 });

    // Apply pagination only if not showing all
    if (!showAll) {
      recipesQuery = recipesQuery.skip(skip).limit(limit);
    }

    // Execute query
    const recipes = await recipesQuery.populate("user", "username");

    // If user is authenticated, check which recipes are in their favorites
    let recipesWithFavorites = recipes;

    if ("user" in req && req.user) {
      // Import User model dynamically to avoid circular dependencies
      const User = (await import("../models/User")).default;

      // Get user with favorites
      const user = await User.findById(req.user._id);

      if (user) {
        // Convert user favorites to string IDs for comparison
        const favoritesSet = new Set(
          user.favorites.map((id: any) => id.toString())
        );

        // Create a new array with the isFavorite flag added
        const recipeObjects = recipes.map((recipe: any) => {
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
          recipeObjects.map((r: any) => ({
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

    // Process the image URL if provided
    let processedImageUrl = "default-recipe.jpg";
    let originalImageUrl = imageUrl;

    if (imageUrl && imageUrl !== "default-recipe.jpg") {
      try {
        // Download image and upload to S3
        processedImageUrl = await processImageUrl(imageUrl);
        console.log(`Processed image URL: ${processedImageUrl}`);
      } catch (imageError) {
        console.error("Error processing image:", imageError);
        // Continue with the original URL if there's an error
        processedImageUrl = imageUrl;
      }
    }

    // Process images in fullRecipe HTML content
    let processedFullRecipe = fullRecipe;
    /* fullRecipe feature temporarily disabled to reduce API costs
    if (fullRecipe) {
      try {
        processedFullRecipe = await processImagesInHtml(fullRecipe, sourceUrl);
        console.log("Successfully processed images in full recipe content");
      } catch (fullRecipeError) {
        console.error(
          "Error processing images in full recipe:",
          fullRecipeError
        );
        // Continue with the original content if there's an error
      }
    }
    */

    // Create a new recipe
    const recipe = new Recipe({
      title,
      description,
      ingredients: processedIngredients,
      instructions,
      cookingTime: cookTimeMinutes || cookingTime, // Use either format
      servings,
      imageUrl: processedImageUrl,
      originalImageUrl,
      user: req.user._id,
      // fullRecipe temporarily disabled to reduce API costs
      // fullRecipe: processedFullRecipe,
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
