import { MongoClient, ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

// Helper function to ensure we have a valid ObjectId
const ensureObjectId = (id: any): ObjectId => {
  if (id instanceof ObjectId) return id;
  if (typeof id === "string") return new ObjectId(id);
  // If it's an object with a toString method (like ObjectId), convert it
  if (id && typeof id.toString === "function")
    return new ObjectId(id.toString());

  throw new Error(`Cannot convert ${id} to ObjectId`);
};

/**
 * Direct backfill of recipe order for all recipes
 * @route POST /api/admin/direct-backfill-recipe-order
 * @access Private/Admin
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  let client: MongoClient | null = null;

  try {
    // Get MongoDB URI from environment variables
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return res.status(500).json({
        message: "MongoDB URI not found in environment variables",
      });
    }

    console.log("Connecting to MongoDB directly...");

    // Connect directly to MongoDB using the MongoDB driver
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log("Connected to MongoDB successfully");

    // Get database name from connection string
    const dbName = mongoUri.split("/").pop()?.split("?")[0];
    if (!dbName) {
      return res.status(500).json({
        message: "Could not determine database name from MongoDB URI",
      });
    }

    console.log(`Using database: ${dbName}`);
    const db = client.db(dbName);

    // List all collections to verify connection
    console.log("Listing collections to verify connection...");
    const collections = await db.listCollections().toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name)
    );

    // Get collections
    const recipesCollection = db.collection("recipes");

    // Verify recipes collection exists and count recipes
    const totalRecipes = await recipesCollection.countDocuments();
    console.log(`Total recipes in database: ${totalRecipes}`);

    if (totalRecipes === 0) {
      return res.status(200).json({
        message: "No recipes found in database. Database might be empty.",
        stats: {
          totalRecipes: 0,
          collections: collections.map((c) => c.name),
        },
      });
    }

    // Test direct update
    console.log("Testing recipe update capability...");
    const testRecipe = await recipesCollection.findOne({});
    if (testRecipe) {
      console.log("Found test recipe:", {
        _id: testRecipe._id,
        title: testRecipe.title || "Untitled",
      });

      // Try updating the test recipe
      const testUpdateResult = await recipesCollection.updateOne(
        { _id: testRecipe._id },
        {
          $set: {
            _testField: "This is a test field that will be removed",
            _testTimestamp: new Date(),
          },
        }
      );

      console.log("Test update result:", testUpdateResult);

      // Remove the test field
      await recipesCollection.updateOne(
        { _id: testRecipe._id },
        { $unset: { _testField: 1, _testTimestamp: 1 } }
      );
    }

    // Get all unique users with recipes
    console.log("Fetching unique users with recipes...");
    const usersWithRecipes = await recipesCollection.distinct("user");
    console.log(`Found ${usersWithRecipes.length} users with recipes`);

    let totalUsersProcessed = 0;
    let totalRecipesProcessed = 0;
    let totalRecipesUpdated = 0;
    const errors: string[] = [];
    const successfulUpdates: any[] = [];

    // Process each user's recipes separately (to maintain per-user ordering)
    for (const userId of usersWithRecipes) {
      try {
        console.log("Processing user ID:", userId);

        // Convert user ID to ObjectId if needed
        let userObjectId;
        try {
          userObjectId = ensureObjectId(userId);
        } catch (error) {
          console.error(
            `Failed to convert user ID ${userId} to ObjectId:`,
            error
          );
          errors.push(
            `Failed to convert user ID ${userId} to ObjectId: ${error}`
          );
          continue;
        }

        // Get all recipes for this user
        const userRecipes = await recipesCollection
          .find({ user: userObjectId })
          .sort({ createdAt: -1 }) // Sort by creation date, newest first
          .toArray();

        console.log(`Found ${userRecipes.length} recipes for user ${userId}`);

        if (userRecipes.length === 0) {
          console.log(`No recipes found for user ${userId}, skipping`);
          continue;
        }

        // Update each recipe with its new recipeOrder
        let updatedCount = 0;
        let alreadyOrderedCount = 0;
        for (let i = 0; i < userRecipes.length; i++) {
          const recipe = userRecipes[i];
          const recipeOrder = i;

          // Check if update is needed
          const needsUpdate =
            recipe.recipeOrder !== recipeOrder ||
            recipe.index !== recipeOrder ||
            recipe.recipeOrder === undefined;

          try {
            if (needsUpdate) {
              // Force update by adding an additional changing field
              const result = await recipesCollection.updateOne(
                { _id: recipe._id },
                {
                  $set: {
                    recipeOrder: recipeOrder,
                    index: recipeOrder, // Also update index for backward compatibility
                    _lastUpdated: new Date(), // Add timestamp to force an update
                  },
                }
              );

              if (result.modifiedCount > 0) {
                updatedCount++;
                successfulUpdates.push({
                  recipeId: recipe._id.toString(),
                  title: recipe.title || "Untitled",
                  recipeOrder,
                  index: recipeOrder,
                });
              } else {
                console.log(
                  `Failed to update recipe ${recipe._id} - no modification reported`
                );
              }
            } else {
              // Recipe already has correct order
              alreadyOrderedCount++;
            }
          } catch (error) {
            console.error(`Failed to update recipe ${recipe._id}:`, error);
            errors.push(`Failed to update recipe ${recipe._id}: ${error}`);
          }
        }

        console.log(
          `Updated ${updatedCount} of ${userRecipes.length} recipes for user ${userId} (${alreadyOrderedCount} already had correct order)`
        );
        totalRecipesUpdated += updatedCount;
        totalRecipesProcessed += userRecipes.length;
        totalUsersProcessed++;
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        errors.push(`Failed to process user ${userId}: ${error}`);
      }
    }

    // Get stats about the updated recipes
    const recipesWithOrder = await recipesCollection.countDocuments({
      recipeOrder: { $exists: true },
    });
    console.log(`Total recipes with recipeOrder field: ${recipesWithOrder}`);

    // Get a sample of the updated recipes for verification
    const sampleRecipes = await recipesCollection
      .find({ recipeOrder: { $exists: true } })
      .limit(5)
      .toArray();

    return res.status(200).json({
      message: "Recipe order backfill completed for all recipes",
      stats: {
        totalRecipes,
        totalUsersWithRecipes: usersWithRecipes.length,
        totalUsersProcessed,
        totalRecipesProcessed,
        totalRecipesUpdated,
        alreadyOrderedRecipes: totalRecipesProcessed - totalRecipesUpdated,
        recipesWithOrder,
        errors: errors.length > 0 ? errors : undefined,
        successfulUpdates:
          successfulUpdates.length > 0
            ? successfulUpdates.slice(0, 10)
            : undefined,
        sampleRecipes:
          sampleRecipes.length > 0
            ? sampleRecipes.map((r) => ({
                _id: r._id,
                title: r.title || "Untitled",
                recipeOrder: r.recipeOrder,
                index: r.index,
                createdAt: r.createdAt,
              }))
            : undefined,
      },
    });
  } catch (error) {
    console.error("Error in direct recipe order backfill:", error);
    return res.status(500).json({
      message: "Server error during backfill",
      error: String(error),
    });
  } finally {
    // Close the MongoDB connection
    if (client) {
      console.log("Closing MongoDB connection");
      await client.close();
    }
  }
}

// Export the handler without protection for API key access
export default handler;
