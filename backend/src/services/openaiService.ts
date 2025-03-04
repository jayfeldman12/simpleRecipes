import dotenv from "dotenv";
import OpenAI from "openai";
import { IRecipeBase } from "../types";

// Load environment variables
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extracts recipe data from HTML content using OpenAI
 */
export const extractRecipeFromHTML = async (
  htmlContent: string,
  sourceUrl?: string
): Promise<IRecipeBase | null> => {
  try {
    console.log(
      `Received HTML content length: ${htmlContent.length} characters`
    );

    // Clean up the HTML - remove scripts, styles, and comments
    let cleanedHtml = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");

    // Extract the full text content from the HTML
    const fullText = cleanedHtml
      .replace(/<[^>]*>/g, " ") // Replace HTML tags with spaces
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();

    // Save the full text of the recipe for later reference
    const fullRecipe = fullText;

    // Limit content to prevent token overflow, focusing on meaningful content
    const contentLimit = 12000; // Reduced from 15000 to leave room for the system and user messages
    if (cleanedHtml.length > contentLimit) {
      // Try to find the main content - look for common content containers
      const mainContentRegexes = [
        /<main[^>]*>([\s\S]*?)<\/main>/i,
        /<article[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*?class="[^"]*?(content|recipe)[^"]*?"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*?id="[^"]*?(content|recipe)[^"]*?"[^>]*>([\s\S]*?)<\/div>/i,
      ];

      let mainContent = "";
      for (const regex of mainContentRegexes) {
        const match = cleanedHtml.match(regex);
        if (match && match[1] && match[1].length > 100) {
          // Must be substantial content
          mainContent = match[1];
          break;
        }
      }

      // If we found main content, use it; otherwise trim from middle
      if (mainContent && mainContent.length < contentLimit) {
        cleanedHtml = mainContent;
        console.log(
          `Using extracted main content: ${mainContent.length} characters`
        );
      } else {
        // Keep beginning and end, trim middle
        const halfLimit = contentLimit / 2;
        cleanedHtml =
          cleanedHtml.substring(0, halfLimit) +
          "\n[CONTENT TRUNCATED FOR LENGTH]\n" +
          cleanedHtml.substring(cleanedHtml.length - halfLimit);
        console.log(`Trimmed HTML to ${cleanedHtml.length} characters`);
      }
    }

    // Prepare prompt for OpenAI with explicit instructions
    const prompt = `
      I need you to carefully extract the complete recipe information from the HTML below.
      
      Return a valid JSON object with these fields:
      - title: string (required) - The recipe title
      - description: string (required) - A brief description of the recipe
      - ingredients: string[] (required) - Each element should be a separate ingredient with amount
      - instructions: string[] (required) - Each element should be a separate instruction step
      - cookingTime: number (optional) - Total cooking time in minutes
      - servings: number (optional) - Number of servings
      - imageUrl: string (optional) - URL of the recipe image try to find the most relevant image, or leave as ""
      
      IMPORTANT:
      1. The response must ONLY contain the JSON object
      2. Look for ingredients lists, preparation steps, cooking times, and recipe metadata
      3. If the HTML doesn't contain recipe information, return { "error": "No recipe found" }
      4. Maintain the original measurements and ingredient names
      
      Here's the HTML content:
      ${cleanedHtml}
    `;

    console.log("Sending request to OpenAI API...");

    // Make API call to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106", // Using a model with improved JSON generation
      messages: [
        {
          role: "system",
          content:
            "You are a specialized recipe extraction service. Your only job is to extract structured recipe data from HTML and return it as valid JSON. Do not include any explanations or text outside of the JSON object.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2, // Lower temperature for more deterministic output
      response_format: { type: "json_object" }, // Request JSON specifically
      max_tokens: 2000,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content in OpenAI response");
      throw new Error("No response from OpenAI");
    }

    console.log(
      "Received response from OpenAI:",
      content.substring(0, 200) + "..."
    );

    // Parse JSON
    const recipeData = JSON.parse(content);

    // Check for error response
    if (recipeData.error) {
      console.log("OpenAI reported no recipe found:", recipeData.error);
      return null;
    }

    // Validate recipe data
    if (
      !recipeData ||
      !recipeData.title ||
      !recipeData.ingredients ||
      !recipeData.instructions
    ) {
      console.error("Invalid or incomplete recipe data:", recipeData);
      return null;
    }

    // Ensure arrays are properly formatted
    recipeData.ingredients = Array.isArray(recipeData.ingredients)
      ? recipeData.ingredients
      : [recipeData.ingredients];

    recipeData.instructions = Array.isArray(recipeData.instructions)
      ? recipeData.instructions
      : [recipeData.instructions];

    // Parse numeric values
    if (recipeData.cookingTime && typeof recipeData.cookingTime === "string") {
      recipeData.cookingTime =
        parseInt(recipeData.cookingTime, 10) || undefined;
    }

    if (recipeData.servings && typeof recipeData.servings === "string") {
      recipeData.servings = parseInt(recipeData.servings, 10) || undefined;
    }

    // Add the full recipe text and source URL to the data
    recipeData.fullRecipe = fullRecipe;
    if (sourceUrl) {
      recipeData.sourceUrl = sourceUrl;
    }

    console.log("Successfully extracted recipe data");
    return recipeData;
  } catch (error) {
    console.error("Error extracting recipe from HTML:", error);
    return null;
  }
};
