import mongoose, { Schema } from "mongoose";
import dbConnect from "../utils/dbConnect";
import { IRecipeDocument, IRecipeModel } from "./types";

// Connect to the database before defining the model
dbConnect();

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
    ingredients: {
      type: mongoose.Schema.Types.Mixed, // Use Mixed type to allow for the complex structure
      required: [true, "Ingredients are required"],
      validate: {
        validator: function (v: any[]) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one ingredient is required",
      },
    },
    instructions: {
      type: mongoose.Schema.Types.Mixed, // Use Mixed type to allow for the complex structure
      required: [true, "Instructions are required"],
      validate: {
        validator: function (v: any[]) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one instruction is required",
      },
    },
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
    originalImageUrl: {
      type: String,
      required: false,
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
    fullRecipe: {
      type: String,
      required: false,
    },
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

// Create and export Recipe model - using mongoose.models to check if model already exists
const Recipe =
  (mongoose.models.Recipe as IRecipeModel) ||
  mongoose.model<IRecipeDocument, IRecipeModel>("Recipe", RecipeSchema);
export default Recipe;
