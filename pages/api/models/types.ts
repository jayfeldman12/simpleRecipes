import { Document, Model, Types } from "mongoose";
import { IngredientType, InstructionItem } from "../../../src/types/recipe";

// Base interfaces (without Document extension)
export interface IUserBase {
  username: string;
  password: string;
  createdAt: Date;
  favorites: Types.ObjectId[];
}

export interface IRecipeBase {
  title: string;
  description: string;
  ingredients: Array<IngredientType>;
  instructions: Array<InstructionItem>;
  cookingTime?: number;
  servings?: number;
  imageUrl: string;
  originalImageUrl?: string;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  fullRecipe?: string;
  sourceUrl?: string;
}

// Document interfaces (for instance methods)
export interface IUserDocument extends IUserBase, Document {
  _id: Types.ObjectId;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface IRecipeDocument extends IRecipeBase, Document {
  formattedCookingTime: string;
}

// Model interfaces
export interface IUserModel extends Model<IUserDocument> {
  // Static methods would go here
}

export interface IRecipeModel extends Model<IRecipeDocument> {
  // Static methods would go here
}

// Token payload
export interface IJwtPayload {
  id: string;
}
