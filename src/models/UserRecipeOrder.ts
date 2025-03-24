import mongoose from "mongoose";

export interface UserRecipeOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  recipeId: mongoose.Types.ObjectId;
  order: number;
  isFavorite: boolean;
  recipeType: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create schema if it doesn't exist
export function getUserRecipeOrderModel() {
  // Check if model already exists
  try {
    return mongoose.model<UserRecipeOrderDocument>("UserRecipeOrder");
  } catch (e) {
    // Create model if it doesn't exist
    const UserRecipeOrderSchema = new mongoose.Schema(
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        recipeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Recipe",
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        isFavorite: {
          type: Boolean,
          default: true,
        },
        recipeType: {
          type: String,
          enum: ["own", "favorite"],
          default: "favorite",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
      {
        timestamps: true,
      }
    );

    // Create a compound index to ensure uniqueness of userId + recipeId
    UserRecipeOrderSchema.index({ userId: 1, recipeId: 1 }, { unique: true });

    // Create the model
    return mongoose.model<UserRecipeOrderDocument>(
      "UserRecipeOrder",
      UserRecipeOrderSchema
    );
  }
}
