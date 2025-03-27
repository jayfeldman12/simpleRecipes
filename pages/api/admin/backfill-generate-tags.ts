import mongoose from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import Tag from "../models/Tag";
import { connectDB } from "../utils/auth";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ensure only POST requests are allowed
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Validate API key for security
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== process.env.BATCH_OPERATIONS_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Get limit parameter with default value of 5
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

  try {
    // Connect to the database
    await connectDB();
    const db = mongoose.connection;

    if (!db.db) {
      return res.status(500).json({ message: "Database connection error" });
    }

    // Get all available tags to provide to OpenAI
    const availableTags = await Tag.find().sort({ name: 1 });
    const tagNames = availableTags.map((tag) => tag.name);

    // Create a map of lowercase tag names to tag documents
    const tagNameMap = new Map();
    availableTags.forEach((tag) => {
      tagNameMap.set(tag.name.toLowerCase(), tag._id);
    });

    // Find recipes with no tags or empty tags array
    console.log(`Finding recipes with missing tags (limit: ${limit})...`);
    const recipes = await db.db
      .collection("recipes")
      .find({
        $or: [{ tags: { $exists: false } }, { tags: null }, { tags: [] }],
      })
      .limit(limit)
      .toArray();

    console.log(`Found ${recipes.length} recipes to process`);

    // Process each recipe
    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      recipeDetails: [] as any[],
    };

    for (const recipe of recipes) {
      results.processed++;
      console.log(
        `Processing recipe ${results.processed}/${recipes.length}: ${recipe.title}`
      );

      try {
        // Prepare recipe data for OpenAI
        const recipeData = {
          title: recipe.title || "",
          description: recipe.description || "",
          ingredients: formatIngredients(recipe.ingredients || []),
          instructions: formatInstructions(recipe.instructions || []),
        };

        // Generate tags using OpenAI
        const tags = await generateTagsWithOpenAI(recipeData, tagNames);

        // Map tag names to tag IDs
        const tagIds = [];

        for (const tagName of tags) {
          const normalizedTagName = tagName.toLowerCase();
          if (tagNameMap.has(normalizedTagName)) {
            tagIds.push(tagNameMap.get(normalizedTagName));
          } else {
            console.log(`Tag "${tagName}" not found in database, skipping`);
          }
        }

        // Only update if we have tags
        if (tagIds.length > 0) {
          const updateResult = await db.db
            .collection("recipes")
            .updateOne({ _id: recipe._id }, { $set: { tags: tagIds } });

          if (updateResult.modifiedCount > 0) {
            results.updated++;
            results.recipeDetails.push({
              _id: recipe._id,
              title: recipe.title,
              tags: tags,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing recipe ${recipe._id}:`, error);
        results.errors++;
      }
    }

    return res.status(200).json({
      message: "Backfill completed",
      results,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Format ingredients for OpenAI
function formatIngredients(ingredients: any[]) {
  if (!Array.isArray(ingredients)) return [];

  const formatted: string[] = [];

  for (const ingredient of ingredients) {
    if (typeof ingredient === "string") {
      formatted.push(ingredient);
    } else if (ingredient && typeof ingredient === "object") {
      if ("text" in ingredient) {
        formatted.push(ingredient.text);
      } else if (
        "sectionTitle" in ingredient &&
        Array.isArray(ingredient.ingredients)
      ) {
        formatted.push(`Section: ${ingredient.sectionTitle}`);
        for (const subIngredient of ingredient.ingredients) {
          if (typeof subIngredient === "string") {
            formatted.push(`  ${subIngredient}`);
          } else if (
            subIngredient &&
            typeof subIngredient === "object" &&
            "text" in subIngredient
          ) {
            formatted.push(`  ${subIngredient.text}`);
          }
        }
      }
    }
  }

  return formatted;
}

// Format instructions for OpenAI
function formatInstructions(instructions: any[]) {
  if (!Array.isArray(instructions)) return [];

  const formatted: string[] = [];

  for (const instruction of instructions) {
    if (typeof instruction === "string") {
      formatted.push(instruction);
    } else if (
      instruction &&
      typeof instruction === "object" &&
      "text" in instruction
    ) {
      formatted.push(instruction.text);
    }
  }

  return formatted;
}

// Generate tags using OpenAI
async function generateTagsWithOpenAI(
  recipeData: any,
  availableTags: string[]
) {
  try {
    // Create a prompt for OpenAI
    const prompt = `
      Please analyze this recipe and assign appropriate tags from the available list.
      
      Recipe Title: ${recipeData.title}
      Description: ${recipeData.description}
      
      Ingredients:
      ${recipeData.ingredients.map((i: string) => `- ${i}`).join("\n")}
      
      Instructions:
      ${recipeData.instructions
        .map((i: string, idx: number) => `${idx + 1}. ${i}`)
        .join("\n")}
      
      Available tags (choose only from this list):
      ${availableTags.join(", ")}
      
      Return only an array of tag names in JSON format. Choose tags that accurately represent the recipe's cuisine, dietary restrictions, main ingredients, cooking method, meal type, and occasion where applicable.
      For example: ["dinner", "vegetarian", "italian", "pasta"]
      
      Choose only the most relevant tags, generally between 2-5 tags per recipe depending on what's appropriate.
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a culinary expert who assigns accurate tags to recipes. You only respond with JSON arrays of tag names, selecting from a provided list of available tags.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const responseContent =
      completion.choices[0].message.content?.trim() || "{}";

    // Parse JSON response
    const parsedResponse = JSON.parse(responseContent);

    // Extract tags from response
    let tags: string[] = [];
    if (parsedResponse.tags && Array.isArray(parsedResponse.tags)) {
      tags = parsedResponse.tags;
    } else if (Array.isArray(parsedResponse)) {
      tags = parsedResponse;
    }

    console.log(
      `Generated ${tags.length} tags for recipe "${
        recipeData.title
      }": ${tags.join(", ")}`
    );
    return tags;
  } catch (error) {
    console.error("Error generating tags with OpenAI:", error);
    return [];
  }
}
