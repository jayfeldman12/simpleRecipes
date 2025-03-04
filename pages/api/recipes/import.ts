import { NextApiResponse } from "next";
import Recipe from "../../../backend/src/models/Recipe";
import { fetchHtmlFromUrl } from "../../../backend/src/services/htmlFetchService";
import { extractRecipeFromHTML } from "../../../backend/src/services/openaiService";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

// @desc    Import recipe from URL
// @route   POST /api/recipes/import
// @access  Private
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  // Connect to the database
  await connectDB();

  // Only allow POST method for this endpoint
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { url } = req.body;

    // Verify that url is provided
    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    // Fetch HTML content from the URL
    const htmlContent = await fetchHtmlFromUrl(url);
    if (!htmlContent) {
      return res
        .status(400)
        .json({ message: "Failed to fetch content from URL" });
    }

    console.log(
      `Successfully fetched HTML from ${url}, length: ${htmlContent.length} characters`
    );

    // Extract recipe data using OpenAI, passing the source URL
    const recipeData = await extractRecipeFromHTML(htmlContent, url);
    if (!recipeData) {
      return res
        .status(400)
        .json({ message: "Failed to extract recipe data from the URL" });
    }

    console.log("Successfully extracted recipe data:", recipeData.title);

    // Create a new recipe
    const userId = req.user._id;
    const recipe = new Recipe({
      ...recipeData,
      user: userId,
      sourceUrl: url, // Also set it explicitly here to ensure it's included
      imageUrl: recipeData.imageUrl || "default-recipe.jpg", // Set default image if none provided
    });

    // Save to database
    const savedRecipe = await recipe.save();
    console.log(`Recipe saved with ID: ${savedRecipe._id}`);

    // Return the recipe data and the ID for redirection
    return res.status(201).json({
      message: "Recipe imported successfully",
      recipe: recipeData,
      recipeId: savedRecipe._id,
    });
  } catch (error) {
    console.error("Error importing recipe:", error);
    return res
      .status(500)
      .json({ message: "Server error while importing recipe" });
  }
}

export default withProtect(handler);
