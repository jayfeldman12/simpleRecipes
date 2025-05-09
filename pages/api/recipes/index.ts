import { NextApiRequest, NextApiResponse } from "next";
import Recipe from "../models/Recipe";
import { UserRecipeModel } from "../models/UserRecipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";
import { processImageUrl } from "../utils/awsS3";

// Handler for GET requests - Get all recipes
async function getRecipes(
  req: AuthNextApiRequest | NextApiRequest,
  res: NextApiResponse
) {
  await connectDB();

  try {
    const { page = 1, limit = 12, tag = null, all = "true" } = req.query;
    const showAll = String(all).toLowerCase() === "true";

    // Parse page and limit to integers
    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);

    // Set up filter based on query parameters
    const filter: any = {};

    // Filter by tag if provided
    if (tag) {
      filter.tags = tag;
    }

    // Count total documents with the filter
    const total = await Recipe.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Get recipes using the filter, with pagination
    let recipesQuery = Recipe.find(filter)
      .populate("user", "username")
      .populate("tags", "name")
      .sort({ createdAt: -1 });

    // Apply pagination only if showAll is false
    if (!showAll) {
      recipesQuery = recipesQuery
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
    }

    // Execute query
    const recipes = await recipesQuery;

    // Default to returning unpersonalized recipes
    let recipesWithUserData = recipes;

    // If user is authenticated, check which recipes are in their favorites and get order info
    if ("user" in req && req.user) {
      // Import User model dynamically to avoid circular dependencies
      const User = (await import("../models/User")).default;

      // Get user
      const user = await User.findById(req.user._id);

      if (user) {
        // Fetch recipe ordering information
        const recipeOrders = await UserRecipeModel.find({
          userId: req.user._id.toString(),
          recipeId: { $in: recipes.map((r: any) => r._id.toString()) },
        });

        // Create a map of recipeId -> order & favorite information
        const orderMap = new Map();
        recipeOrders.forEach((order) => {
          orderMap.set(order.recipeId, {
            order: order.order,
            isFavorite: order.isFavorite,
          });
        });

        // Add user-specific data to each recipe
        recipesWithUserData = recipes.map((recipe: any) => {
          const userData = orderMap.get(recipe._id.toString()) || {
            isFavorite: false,
            order: Number.MAX_SAFE_INTEGER,
          };

          return {
            ...recipe.toObject(),
            isFavorite: userData.isFavorite,
            order: userData.order,
          };
        });

        // Sort recipes by order only
        const sortedRecipes = recipesWithUserData.sort(
          (a: { order: number }, b: { order: number }) => a.order - b.order
        );

        return res.status(200).json({
          recipes: sortedRecipes,
          totalPages,
          currentPage: pageNum,
        });
      }
    }

    return res.status(200).json({
      recipes,
      page: pageNum,
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
      tags,
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
      tags: tags || [],
    });

    // Save to database
    const savedRecipe = await recipe.save();

    // Populate tags in the response
    await savedRecipe.populate("tags", "name");

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
