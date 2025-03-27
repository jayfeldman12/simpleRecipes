import mongoose from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import Tag from "../models/Tag";
import { connectDB } from "../utils/auth";

// Array of common recipe tags
const COMMON_TAGS = [
  "breakfast",
  "lunch",
  "dinner",
  "dessert",
  "appetizer",
  "snack",
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "keto",
  "low-carb",
  "high-protein",
  "quick",
  "easy",
  "healthy",
  "soup",
  "salad",
  "pasta",
  "chicken",
  "beef",
  "pork",
  "seafood",
  "fish",
  "baking",
  "grilling",
  "slow-cooker",
  "instant-pot",
  "meal-prep",
  "budget-friendly",
  "italian",
  "mexican",
  "asian",
  "indian",
  "mediterranean",
  "american",
  "french",
  "holiday",
  "summer",
  "winter",
  "fall",
  "spring",
];

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

  try {
    // Connect to the database
    await connectDB();
    const db = mongoose.connection;

    if (!db.db) {
      return res.status(500).json({ message: "Database connection error" });
    }

    console.log("Creating initial tags...");

    // Array to track tags created or found
    const results = {
      created: 0,
      alreadyExist: 0,
      tags: [] as string[],
    };

    // Process each tag
    for (const tagName of COMMON_TAGS) {
      // Check if tag already exists
      const existingTag = await Tag.findOne({ name: tagName });

      if (existingTag) {
        console.log(`Tag "${tagName}" already exists`);
        results.alreadyExist++;
        results.tags.push(tagName);
      } else {
        // Create the tag
        const newTag = new Tag({ name: tagName });
        await newTag.save();
        console.log(`Created tag "${tagName}"`);
        results.created++;
        results.tags.push(tagName);
      }
    }

    return res.status(200).json({
      message: "Initial tags backfill completed successfully",
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
