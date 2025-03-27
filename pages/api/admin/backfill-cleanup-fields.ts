import mongoose from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "../utils/auth";

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

    // 1. Rename UserRecipeOrder collection to UserRecipe
    console.log("Renaming UserRecipeOrder collection to UserRecipe...");
    try {
      const collections = await db.db.listCollections().toArray();
      const collectionExists = collections.some(
        (c) => c.name === "userrecipeorders"
      );

      if (collectionExists) {
        await db.db.collection("userrecipeorders").rename("userrecipes");
        console.log("Collection renamed successfully");
      } else {
        console.log("UserRecipeOrder collection not found, skipping rename");
      }
    } catch (error) {
      console.error("Error renaming collection:", error);
    }

    // 2. Remove favorites field from User documents
    console.log("Removing favorites field from User documents...");
    try {
      const result = await db.db.collection("users").updateMany(
        {}, // match all documents
        { $unset: { favorites: "" } }
      );
      console.log(`Modified ${result.modifiedCount} user documents`);
    } catch (error) {
      console.error("Error removing favorites field:", error);
    }

    // 3. Remove index and recipeOrder fields from Recipe documents
    console.log(
      "Removing index and recipeOrder fields from Recipe documents..."
    );
    try {
      const result = await db.db.collection("recipes").updateMany(
        {}, // match all documents
        { $unset: { index: "", recipeOrder: "" } }
      );
      console.log(`Modified ${result.modifiedCount} recipe documents`);
    } catch (error) {
      console.error("Error removing index and recipeOrder fields:", error);
    }

    return res.status(200).json({
      message: "Backfill completed successfully",
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
