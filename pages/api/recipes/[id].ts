import { NextApiRequest, NextApiResponse } from "next";
import Recipe from "../../../backend/src/models/Recipe";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

// Handler for GET requests - Get a recipe by ID
async function getRecipeById(req: NextApiRequest, res: NextApiResponse) {
  await connectDB();

  try {
    const { id } = req.query;
    const recipe = await Recipe.findById(id).populate("user", "username");

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    return res.status(200).json(recipe);
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

    // Update recipe fields
    recipe.title = title || recipe.title;
    recipe.description = description || recipe.description;
    recipe.ingredients = ingredients || recipe.ingredients;
    recipe.instructions = instructions || recipe.instructions;
    recipe.cookingTime =
      cookingTime !== undefined ? cookingTime : recipe.cookingTime;
    recipe.servings = servings !== undefined ? servings : recipe.servings;
    recipe.imageUrl = imageUrl || recipe.imageUrl;
    recipe.fullRecipe =
      fullRecipe !== undefined ? fullRecipe : recipe.fullRecipe;
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
