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
 * Force reindex all recipes by first removing index fields, then adding them back
 * @route POST /api/admin/force-reindex-recipes
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

    // Get collections
    const recipesCollection = db.collection("recipes");

    // Verify recipes collection exists and count recipes
    const totalRecipes = await recipesCollection.countDocuments();
    console.log(`Total recipes in database: ${totalRecipes}`);

    if (totalRecipes === 0) {
      return res.status(200).json({
        message: "No recipes found in database.",
        stats: { totalRecipes: 0 },
      });
    }

    // STEP 1: Remove all index and recipeOrder fields from all recipes
    console.log(
      "STEP 1: Removing existing index and recipeOrder fields from all recipes"
    );
    const removeResult = await recipesCollection.updateMany(
      {}, // Match all documents
      { $unset: { index: "", recipeOrder: "" } }
    );

    console.log("Field removal result:", {
      matched: removeResult.matchedCount,
      modified: removeResult.modifiedCount,
    });

    // Verify removal
    const recipesWithOrderAfterRemoval = await recipesCollection.countDocuments(
      {
        $or: [{ index: { $exists: true } }, { recipeOrder: { $exists: true } }],
      }
    );

    console.log(
      `Recipes with ordering fields after removal: ${recipesWithOrderAfterRemoval}`
    );

    // Get all unique users with recipes
    console.log("STEP 2: Adding new ordering fields");
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
        for (let i = 0; i < userRecipes.length; i++) {
          const recipe = userRecipes[i];
          const recipeOrder = i;

          try {
            // Now add the fields back with new values
            const result = await recipesCollection.updateOne(
              { _id: recipe._id },
              {
                $set: {
                  recipeOrder: recipeOrder,
                  index: recipeOrder,
                  _lastIndexUpdate: new Date(),
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
          } catch (error) {
            console.error(`Failed to update recipe ${recipe._id}:`, error);
            errors.push(`Failed to update recipe ${recipe._id}: ${error}`);
          }
        }

        console.log(
          `Updated ${updatedCount} of ${userRecipes.length} recipes for user ${userId}`
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

    const recipesWithIndex = await recipesCollection.countDocuments({
      index: { $exists: true },
    });
    console.log(`Total recipes with index field: ${recipesWithIndex}`);

    // Get a sample of the updated recipes for verification
    const sampleRecipes = await recipesCollection
      .find({ recipeOrder: { $exists: true } })
      .limit(5)
      .toArray();

    return res.status(200).json({
      message: "Recipe order force reindex completed",
      stats: {
        totalRecipes,
        initialRemoval: {
          matched: removeResult.matchedCount,
          modified: removeResult.modifiedCount,
        },
        reindexing: {
          totalUsersWithRecipes: usersWithRecipes.length,
          totalUsersProcessed,
          totalRecipesProcessed,
          totalRecipesUpdated,
        },
        verification: {
          recipesWithOrder,
          recipesWithIndex,
        },
        errors: errors.length > 0 ? errors : undefined,
        sampleRecipes: sampleRecipes.map((r) => ({
          _id: r._id,
          title: r.title || "Untitled",
          recipeOrder: r.recipeOrder,
          index: r.index,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error in force reindex recipes:", error);
    return res.status(500).json({
      message: "Server error during reindexing",
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
