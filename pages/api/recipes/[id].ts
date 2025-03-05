import { NextApiRequest, NextApiResponse } from "next";
import Recipe from "../models/Recipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";
import { processImageUrl, processImagesInHtml } from "../utils/awsS3";

// Handler for GET requests - Get a recipe by ID
async function getRecipeById(
  req: NextApiRequest | AuthNextApiRequest,
  res: NextApiResponse
) {
  await connectDB();

  try {
    const { id } = req.query;
    const recipe = await Recipe.findById(id).populate("user", "username");

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Check if this recipe is in the user's favorites
    let isFavorite = false;

    if ((req as AuthNextApiRequest).user) {
      // Import User model dynamically to avoid circular dependencies
      const User = (await import("../models/User")).default;

      // Access user data safely with optional chaining
      const userId = (req as AuthNextApiRequest).user?._id;

      if (userId) {
        const user = await User.findById(userId);

        if (user && user.favorites) {
          isFavorite = user.favorites.some((favId) => favId.toString() === id);
        }
      }
    }

    // Return the recipe with the isFavorite flag
    const recipeData = recipe.toJSON();
    return res.status(200).json({
      ...recipeData,
      isFavorite,
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

// Handler for PUT requests - Update a recipe
async function updateRecipe(req: AuthNextApiRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.query;
    const recipe = await Recipe.findById(id);

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Check if user is the owner of the recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this recipe" });
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

    // Process the image URL if it has changed
    let processedImageUrl = recipe.imageUrl;

    if (
      imageUrl &&
      imageUrl !== recipe.imageUrl &&
      imageUrl !== "default-recipe.jpg"
    ) {
      try {
        // Download image and upload to S3
        processedImageUrl = await processImageUrl(imageUrl);
        console.log(`Processed updated image URL: ${processedImageUrl}`);

        // Store the original URL if it's not already set
        if (!recipe.originalImageUrl) {
          recipe.originalImageUrl = imageUrl;
        }
      } catch (imageError) {
        console.error("Error processing image during update:", imageError);
        // Continue with the provided URL if there's an error
        processedImageUrl = imageUrl;
      }
    }

    // Process images in fullRecipe HTML content if it has changed
    let processedFullRecipe = fullRecipe;
    if (fullRecipe && fullRecipe !== recipe.fullRecipe) {
      try {
        processedFullRecipe = await processImagesInHtml(
          fullRecipe,
          recipe.sourceUrl
        );
        console.log(
          "Successfully processed images in updated full recipe content"
        );
      } catch (fullRecipeError) {
        console.error(
          "Error processing images in full recipe update:",
          fullRecipeError
        );
        // Continue with the original content if there's an error
      }
    }

    // Update recipe fields
    recipe.title = title || recipe.title;
    recipe.description = description || recipe.description;
    recipe.ingredients = ingredients || recipe.ingredients;
    recipe.instructions = instructions || recipe.instructions;
    recipe.cookingTime =
      cookingTime !== undefined ? cookingTime : recipe.cookingTime;
    recipe.servings = servings !== undefined ? servings : recipe.servings;
    recipe.imageUrl = processedImageUrl;
    recipe.fullRecipe =
      processedFullRecipe !== undefined
        ? processedFullRecipe
        : recipe.fullRecipe;
    recipe.sourceUrl = sourceUrl !== undefined ? sourceUrl : recipe.sourceUrl;

    // Save updated recipe
    const updatedRecipe = await recipe.save();
    return res.status(200).json(updatedRecipe);
  } catch (error) {
    console.error("Error updating recipe:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

// Handler for DELETE requests - Delete a recipe
async function deleteRecipe(req: AuthNextApiRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.query;
    const recipe = await Recipe.findById(id);

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Check if user is the owner of the recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this recipe" });
    }

    await Recipe.deleteOne({ _id: id });
    return res.status(200).json({ message: "Recipe removed" });
  } catch (error) {
    console.error("Error deleting recipe:", error);
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
      return getRecipeById(req, res);
    } else if (req.method === "PUT") {
      // PUT requires authentication
      return withProtect(updateRecipe as any)(req as AuthNextApiRequest, res);
    } else if (req.method === "DELETE") {
      // DELETE requires authentication
      return withProtect(deleteRecipe as any)(req as AuthNextApiRequest, res);
    } else {
      return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in recipe API:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
