import mongoose, { Schema } from "mongoose";
import { IRecipeDocument, IRecipeModel } from "../types";

// Create a recipe schema
const RecipeSchema = new Schema<IRecipeDocument>(
  {
    title: {
      type: String,
      required: [true, "Recipe title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Recipe description is required"],
    },
    ingredients: [
      {
        type: String,
        required: [true, "Ingredients are required"],
      },
    ],
    instructions: [
      {
        type: String,
        required: [true, "Instructions are required"],
      },
    ],
    cookingTime: {
      type: Number,
      required: false,
    },
    servings: {
      type: Number,
      required: false,
    },
    imageUrl: {
      type: String,
      default: "default-recipe.jpg",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // Add fullRecipe field to store the original recipe text
    fullRecipe: {
      type: String,
      required: false,
    },
    // Add sourceUrl field to store where the recipe came from
    sourceUrl: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add virtual for the formatted cooking time
RecipeSchema.virtual("formattedCookingTime").get(function (
  this: IRecipeDocument
) {
  if (!this.cookingTime) return "Not specified";

  const hours = Math.floor(this.cookingTime / 60);
  const minutes = this.cookingTime % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hr ${minutes} min`;
  } else if (hours > 0) {
    return `${hours} hr`;
  } else {
    return `${minutes} min`;
  }
});

// Create and export Recipe model
const Recipe = mongoose.model<IRecipeDocument, IRecipeModel>(
  "Recipe",
  RecipeSchema
);
export default Recipe;
