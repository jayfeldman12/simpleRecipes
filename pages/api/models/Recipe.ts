import mongoose, { Schema } from "mongoose";
import { IngredientType, InstructionItem } from "../../../src/types/recipe";
import { connectDB } from "../../utils/database";

// Interface for Recipe document
export interface RecipeDocument extends mongoose.Document {
  title: string;
  description: string;
  image?: string;
  ingredients: string[];
  cookingTime: number;
  steps: string[];
  user: mongoose.Types.ObjectId;
  recipeOrder?: number;
  index?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Get Recipe model (creates if doesn't exist)
export function getRecipeModel(): mongoose.Model<RecipeDocument> {
  try {
    return mongoose.model<RecipeDocument>("Recipe");
  } catch (error) {
    // Define schema if model doesn't exist yet
    const RecipeSchema = new Schema<RecipeDocument>(
      {
        title: {
          type: String,
          required: [true, "Please add a title"],
          trim: true,
          maxlength: [100, "Title cannot be more than 100 characters"],
        },
        description: {
          type: String,
          required: [true, "Please add a description"],
          trim: true,
          maxlength: [500, "Description cannot be more than 500 characters"],
        },
        image: {
          type: String,
        },
        ingredients: {
          type: [String],
          required: [true, "Please add ingredients"],
        },
        cookingTime: {
          type: Number,
          required: [true, "Please add cooking time"],
        },
        steps: {
          type: [String],
          required: [true, "Please add steps"],
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        recipeOrder: {
          type: Number,
        },
        index: {
          type: Number,
        },
      },
      {
        timestamps: true,
      }
    );

    return mongoose.model<RecipeDocument>("Recipe", RecipeSchema);
  }
}

// Get Recipe model with DB connection
export async function getRecipeModelWithDB(): Promise<
  mongoose.Model<RecipeDocument>
> {
  await connectDB();
  return getRecipeModel();
}

// Use 'as any' for the imported types to avoid TypeScript errors
type IRecipeDocument = any;
type IRecipeModel = any;

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
        validator: function (v: IngredientType[]) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one ingredient is required",
      },
    },
    instructions: {
      type: mongoose.Schema.Types.Mixed, // Use Mixed type to allow for the complex structure
      required: [true, "Instructions are required"],
      validate: {
        validator: function (v: InstructionItem[]) {
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
    index: {
      type: Number,
      default: 0, // Default to 0 for existing recipes
    },
    recipeOrder: {
      type: Number,
      default: 0, // Default to 0 for existing recipes
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
