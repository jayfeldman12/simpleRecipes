/**
 * OpenAI Service
 *
 * Service for extracting recipe data from HTML content using OpenAI's API
 */

import OpenAI from "openai";
import {
  IngredientItem,
  IngredientType,
  InstructionItem,
  Recipe,
} from "../../../src/types/recipe";

// Define the OpenAI response type
interface OpenAIRecipeResponse extends Partial<Recipe> {
  error?: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract recipe data from HTML content using OpenAI
 * @param content The content (HTML or text) containing the recipe
 * @param sourceUrl Optional source URL of the recipe
 * @param availableTags Optional array of available tags to choose from
 * @returns A structured recipe object or null if extraction fails
 */
export const extractRecipeFromHTML = async (
  content: string,
  sourceUrl?: string,
  availableTags?: string[]
): Promise<Recipe | null> => {
  try {
    console.log(`Received content length: ${content.length} characters`);

    // Check if we need to truncate content for token limits
    const contentLimit = 60000;
    let processedContent = content;

    if (processedContent.length > contentLimit) {
      console.log(
        `Content exceeds OpenAI token limit (${processedContent.length} chars). Truncating...`
      );

      // Keep beginning, truncate end where comments usually are
      processedContent =
        processedContent.substring(0, contentLimit) +
        "\n[CONTENT TRUNCATED FOR LENGTH]\n";

      console.log(
        `Truncated content is now ${processedContent.length} characters`
      );
    }

    // Add tag suggestions to the prompt if available
    let tagSuggestionText = "";
    if (availableTags && availableTags.length > 0) {
      tagSuggestionText = `
      - tags: array (optional) - An array of relevant tags for the recipe. Choose from these available tags: ${availableTags.join(
        ", "
      )}.
        For example, if the recipe is for a dessert that uses chocolate, you might include tags like: ["dessert", "chocolate"].
        Only include tags that are in the provided list and are highly relevant to the recipe.
      `;
    }

    // Prepare prompt for OpenAI
    const prompt = `
      I need you to carefully extract the complete recipe information from the text or HTML content below. If HTML was provided, note that it may be very stripped down, and all p, div, span, h1, strong, etc tags may have been removed.
      
      You're looking for a recipe in this content. If you can identify a recipe:
      
      Return a valid JSON object with these fields:
      - title: string (required) - The recipe title
      - description: string (required) - A brief description of the recipe
      - ingredients: array (required) - Array of ingredient objects, each with:
        - text: string (required) - The ingredient text with amount and unit
        - optional: boolean (optional) - Whether the ingredient is optional. Only mark this if the recipe explicitly says it's optional.
        Notes: Don't add substitutes. Use imperial units instead of metric when both are given. If there is extra information, like the butter needs to be softened, that should be included in as few words as possible, no need to keep the exact original wording as long as the meaning is the same. Format should be '[amount] [ingredient] (extra info, if needed)'. If the recipe groups ingredients into sections (like "For the cake", "For the frosting"), organize them accordingly.
      - instructions: array (required) - Array of instruction objects, each with:
        - text: string (required) - A separate instruction step
      - cookingTime: number (optional) - Total cooking time in minutes. If not found, do not include this field.
      - servings: number (optional) - Number of servings. If not found, do not include this field.
      - imageUrl: string (optional) - URL of the recipe main image (hero image). Try to find the most relevant image, which will often be the first image in the article. If you cannot figure out the main image, try to use any image in the article. If you cannot find any images, leave as ""
      ${tagSuggestionText}
      
      IMPORTANT:
      1. The response must ONLY contain the JSON object
      2. Look for ingredients lists, preparation steps, cooking times, and recipe metadata
      3. If the content doesn't contain recipe information, return { "error": "No recipe found" }
      4. Maintain the original measurements and ingredient names
      5. For ingredients with sections, use this structure:
         {
           "ingredients": [
             { "text": "1 cup flour" },
             { "text": "2 tbsp sugar", "optional": true },
             { 
               "sectionTitle": "For the frosting",
               "ingredients": [
                 { "text": "1 cup powdered sugar" },
                 { "text": "2 tbsp butter" }
               ]
             }
           ]
         }
      
      Here's the content:
      ${processedContent}
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
    let parsedResponse: OpenAIRecipeResponse;
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
      console.log("Original content length:", content.length);
      console.log("Processed content length:", processedContent.length);
      console.log(
        "Content sample:",
        processedContent.substring(0, 500) + "..."
      );
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

    // Ensure arrays are properly formatted and structured correctly
    if (!Array.isArray(parsedResponse.ingredients)) {
      parsedResponse.ingredients = [
        { text: String(parsedResponse.ingredients || "") } as IngredientItem,
      ];
    } else {
      // Convert simple string ingredients to proper format if needed
      parsedResponse.ingredients = parsedResponse.ingredients.map(
        (item: string | IngredientType) => {
          if (typeof item === "string") {
            return { text: item } as IngredientItem;
          }
          // Make sure we return IngredientItem only
          if ("sectionTitle" in item) {
            // This is an IngredientSection, which we shouldn't have in OpenAI response
            // Convert it to a simple ingredient
            return { text: item.sectionTitle } as IngredientItem;
          }
          return item as IngredientItem;
        }
      );
    }

    // Ensure instructions are in the right format
    if (!Array.isArray(parsedResponse.instructions)) {
      parsedResponse.instructions = [
        { text: String(parsedResponse.instructions || "") } as InstructionItem,
      ];
    } else {
      // Convert simple string instructions to proper format if needed
      parsedResponse.instructions = parsedResponse.instructions.map(
        (item: string | InstructionItem) => {
          if (typeof item === "string") {
            return { text: item } as InstructionItem;
          }
          return item;
        }
      );
    }

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
    const recipe: Partial<Recipe> = {
      title: parsedResponse.title,
      description: parsedResponse.description || "",
      ingredients: parsedResponse.ingredients,
      instructions: parsedResponse.instructions,
      cookingTime: parsedResponse.cookingTime,
      servings: parsedResponse.servings,
      imageUrl: parsedResponse.imageUrl || "default-recipe.jpg",
      // fullRecipe temporarily disabled to reduce API costs
      // fullRecipe: parsedResponse.fullRecipe || content,
      sourceUrl: sourceUrl || "",
      user: { _id: "", username: "" }, // Will be set properly by the controller
      createdAt: new Date().toISOString(),
    };

    // Include tags if provided in the response
    if (parsedResponse.tags && Array.isArray(parsedResponse.tags)) {
      recipe.tags = parsedResponse.tags;
    }

    return recipe as Recipe;
  } catch (error) {
    console.error("Error extracting recipe with OpenAI:", error);
    return null;
  }
};

// Export the module
export default {
  extractRecipeFromHTML,
};
