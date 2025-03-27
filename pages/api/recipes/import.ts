import { NextApiResponse } from "next";
import Recipe from "../models/Recipe";
import Tag from "../models/Tag";
import { fetchHtmlFromUrl } from "../services/htmlFetchService";
import { extractRecipeFromHTML } from "../services/openaiService";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";
import { processImageUrl } from "../utils/awsS3";

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

    // Get all available tags to help OpenAI tag the recipe
    const availableTags = await Tag.find().sort({ name: 1 });
    const tagNames = availableTags.map((tag) => tag.name);

    // Extract recipe data using OpenAI, passing the sourceUrl and available tags
    const recipeData = await extractRecipeFromHTML(htmlContent, url, tagNames);
    if (!recipeData) {
      return res
        .status(400)
        .json({ message: "Failed to extract recipe data from the URL" });
    }

    console.log("Successfully extracted recipe data:", recipeData.title);

    // Convert tag names to tag IDs if tags are provided
    if (
      recipeData.tags &&
      Array.isArray(recipeData.tags) &&
      recipeData.tags.length > 0
    ) {
      try {
        // Create a map of lowercase tag names to tag documents
        const tagNameMap = new Map();
        availableTags.forEach((tag) => {
          tagNameMap.set(tag.name.toLowerCase(), tag._id);
        });

        // Map tag names to tag IDs
        const tagIds = [];
        // Use any here to bypass TypeScript's strict type checking
        const tagArray = recipeData.tags as any[];

        for (const tagItem of tagArray) {
          let tagName = null;

          if (typeof tagItem === "string") {
            tagName = tagItem.toLowerCase();
          } else if (
            tagItem &&
            typeof tagItem === "object" &&
            "name" in tagItem
          ) {
            tagName = tagItem.name.toLowerCase();
          }

          if (tagName && tagNameMap.has(tagName)) {
            tagIds.push(tagNameMap.get(tagName));
          }
        }

        // Replace tag names with tag IDs
        recipeData.tags = tagIds;
      } catch (error) {
        console.error("Error processing tags:", error);
        // If there's an error, just remove the tags
        delete recipeData.tags;
      }
    }

    // Process the image URL if provided
    let processedImageUrl = "default-recipe.jpg";
    let originalImageUrl = recipeData.imageUrl;

    if (recipeData.imageUrl && recipeData.imageUrl !== "default-recipe.jpg") {
      try {
        // Download image and upload to S3
        processedImageUrl = await processImageUrl(recipeData.imageUrl);
        console.log(`Processed image URL during import: ${processedImageUrl}`);
      } catch (imageError) {
        console.error("Error processing image during import:", imageError);
        // Continue with the original URL if there's an error
        processedImageUrl = recipeData.imageUrl;
      }
    }

    // Process images in fullRecipe HTML content
    let processedFullRecipe = recipeData.fullRecipe;
    /* fullRecipe feature temporarily disabled to reduce API costs
    if (recipeData.fullRecipe) {
      try {
        processedFullRecipe = await processImagesInHtml(
          recipeData.fullRecipe,
          url
        );
        console.log(
          "Successfully processed images in imported full recipe content"
        );
      } catch (fullRecipeError) {
        console.error(
          "Error processing images in imported full recipe:",
          fullRecipeError
        );
        // Continue with the original content if there's an error
      }
    }
    */

    // Create a new recipe
    const userId = req.user._id;
    const recipe = new Recipe({
      ...recipeData,
      user: userId,
      sourceUrl: url, // Explicitly set the source URL
      imageUrl: processedImageUrl,
      originalImageUrl,
      // fullRecipe temporarily disabled to reduce API costs
      // fullRecipe: processedFullRecipe,
    });

    // Save to database
    const savedRecipe = await recipe.save();
    console.log(`Recipe saved with ID: ${savedRecipe._id}`);

    // Return the recipe data and the ID for redirection
    return res.status(201).json({
      message: "Recipe imported successfully",
      recipe: savedRecipe,
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
