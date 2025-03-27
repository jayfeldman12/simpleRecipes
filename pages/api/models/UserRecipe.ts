import mongoose from "mongoose";

export type UserRecipe = {
  _id?: string;
  userId: string;
  recipeId: string;
  order: number;
  isFavorite: boolean;
};

const userRecipeSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    recipeId: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    isFavorite: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on userId and recipeId to ensure uniqueness
userRecipeSchema.index({ userId: 1, recipeId: 1 }, { unique: true });

// Create an index on userId and order for efficient sorting
userRecipeSchema.index({ userId: 1, order: 1 });

export const UserRecipeModel =
  mongoose.models.UserRecipe || mongoose.model("UserRecipe", userRecipeSchema);
