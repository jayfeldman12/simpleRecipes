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
      required: [true, "Cooking time is required"],
    },
    servings: {
      type: Number,
      required: [true, "Number of servings is required"],
    },
    imageUrl: {
      type: String,
      default: "default-recipe.jpg",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
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
