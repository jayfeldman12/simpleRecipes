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

    // Update all recipes that don't have a tags field or have null tags
    console.log("Ensuring all recipes have a tags array...");
    let result;
    try {
      result = await db.db.collection("recipes").updateMany(
        { $or: [{ tags: { $exists: false } }, { tags: null }] }, // match documents without tags or null tags
        { $set: { tags: [] } } // set tags to empty array
      );
      console.log(
        `Updated ${result.modifiedCount} recipe documents with empty tags array`
      );
    } catch (error) {
      console.error("Error updating recipe tags:", error);
      return res.status(500).json({
        message: "Error updating recipe tags",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return res.status(200).json({
      message: "Backfill completed successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
