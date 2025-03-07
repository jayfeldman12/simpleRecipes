/**
 * OpenAI Service
 *
 * Service for extracting recipe data from HTML content using OpenAI's API
 */

import OpenAI from "openai";
import { IRecipeBase } from "../models/types";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract recipe data from HTML content using OpenAI
 * @param htmlContent The HTML content containing the recipe
 * @param sourceUrl Optional source URL of the recipe
 * @returns A structured recipe object or null if extraction fails
 */
export const extractRecipeFromHTML = async (
  htmlContent: string,
  sourceUrl?: string
): Promise<IRecipeBase | null> => {
  try {
    console.log(
      `Received optimized HTML content length: ${htmlContent.length} characters`
    );

    // Check if we need to truncate content for token limits
    const contentLimit = 60000;
    let processedHtml = htmlContent;

    if (processedHtml.length > contentLimit) {
      console.log(
        `HTML content still exceeds OpenAI token limit (${processedHtml.length} chars). Truncating...`
      );

      // Keep beginning, truncate end where comments usually are
      processedHtml =
        processedHtml.substring(0, contentLimit) +
        "\n[CONTENT TRUNCATED FOR LENGTH]\n";

      console.log(`Truncated HTML is now ${processedHtml.length} characters`);
    }

    // Prepare prompt for OpenAI
    const prompt = `
      I need you to carefully extract the complete recipe information from the HTML content below. The HTML is very stripped down, and all p, div, span, h1, strong, etc tags have all been removed.
      
      You're looking for a recipe in this HTML. If you can identify a recipe:
      
      Return a valid JSON object with these fields:
      - title: string (required) - The recipe title
      - description: string (required) - A brief description of the recipe
      - ingredients: string[] (required) - Each element should be a separate ingredient with amount and unit. Do not add substitutes. If they give units in the metric and imperial system, just use the imperial system unit and drop the metric unit. If there is extra information, like the butter needs to be softened, that should be included in as few words as possible, no need to keep the exact original wording as long as the meaning is the same.  The format should be '[amount] [ingredient] (extra info, if needed)'.
      - instructions: string[] (required) - Each element should be a separate instruction step
      - cookingTime: number (optional) - Total cooking time in minutes. If not found, do not include this field.
      - servings: number (optional) - Number of servings. If not found, do not include this field.
      - imageUrl: string (optional) - URL of the recipe main image (hero image). Try to find the most relevant image, which will often be the first image in the article. If you cannot figure out the main image, try to use any image in the article. If you cannot find any images, leave as ""
      
      
      IMPORTANT:
      1. The response must ONLY contain the JSON object
      2. Look for ingredients lists, preparation steps, cooking times, and recipe metadata
      3. If the HTML doesn't contain recipe information, return { "error": "No recipe found" }
      4. Maintain the original measurements and ingredient names
      
      Here's the HTML content:
      ${processedHtml}
    `;

    console.log("Sending request to OpenAI with prompt length:", prompt.length);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a specialized recipe extraction assistant. Your job is to extract complete recipe information from HTML content and return it in a structured JSON format",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message.content?.trim();

    if (!responseContent) {
      console.error("Empty response from OpenAI");
      return null;
    }

    console.log(
      "Received response from OpenAI (length: " + responseContent.length + "):",
      responseContent.substring(0, 300) + "..."
    );

    // Parse JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (err) {
      console.error("Failed to parse OpenAI response:", err);
      console.error("Raw response:", responseContent);
      return null;
    }

    // Check for error
    if (parsedResponse.error) {
      console.error("OpenAI extraction error:", parsedResponse.error);
      console.log("Original HTML length:", htmlContent.length);
      console.log("Processed HTML length:", processedHtml.length);
      console.log("HTML sample:", processedHtml.substring(0, 500) + "...");
      return null;
    }

    // Ensure required fields are present
    if (
      !parsedResponse.title ||
      !parsedResponse.ingredients ||
      !parsedResponse.instructions
    ) {
      console.error("Missing required fields in OpenAI response");
      return null;
    }

    // Ensure arrays are properly formatted
    parsedResponse.ingredients = Array.isArray(parsedResponse.ingredients)
      ? parsedResponse.ingredients
      : [parsedResponse.ingredients];

    parsedResponse.instructions = Array.isArray(parsedResponse.instructions)
      ? parsedResponse.instructions
      : [parsedResponse.instructions];

    // Parse numeric values
    if (
      parsedResponse.cookingTime &&
      typeof parsedResponse.cookingTime === "string"
    ) {
      parsedResponse.cookingTime =
        parseInt(parsedResponse.cookingTime, 10) || undefined;
    }

    if (
      parsedResponse.servings &&
      typeof parsedResponse.servings === "string"
    ) {
      parsedResponse.servings =
        parseInt(parsedResponse.servings, 10) || undefined;
    }

    // Construct recipe object
    const recipe: Partial<IRecipeBase> = {
      title: parsedResponse.title,
      description: parsedResponse.description || "",
      ingredients: parsedResponse.ingredients,
      instructions: parsedResponse.instructions,
      cookingTime: parsedResponse.cookingTime,
      servings: parsedResponse.servings,
      imageUrl: parsedResponse.imageUrl || "default-recipe.jpg",
      // fullRecipe temporarily disabled to reduce API costs
      // fullRecipe: parsedResponse.fullRecipe || htmlContent,
      sourceUrl: sourceUrl || "",
      user: undefined, // Will be set by the controller
      createdAt: new Date(),
    };

    return recipe as IRecipeBase;
  } catch (error) {
    console.error("Error extracting recipe with OpenAI:", error);
    return null;
  }
};

// Export the module
export default {
  extractRecipeFromHTML,
};
