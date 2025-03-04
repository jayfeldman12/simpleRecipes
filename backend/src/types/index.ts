import { Request } from "express";
import { Document, Model, Types } from "mongoose";

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
  ingredients: string[];
  instructions: string[];
  cookingTime?: number;
  servings?: number;
  imageUrl: string;
  user: Types.ObjectId;
  createdAt: Date;
  fullRecipe?: string;
  sourceUrl?: string;
}

// Document interfaces (for instance methods)
export interface IUserDocument extends IUserBase, Document {
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

// Extended Express Request with user property
export interface IAuthRequest extends Request {
  user?: IUserDocument | null;
}

// Token payload
export interface IJwtPayload {
  id: string;
}
