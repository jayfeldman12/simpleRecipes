import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../../utils/database";
import { IUserDocument, IUserModel } from "./types";

// User document interface
export interface UserDocument extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Get User model (creates if doesn't exist)
export function getUserModel(): mongoose.Model<UserDocument> {
  try {
    return mongoose.model<UserDocument>("User");
  } catch (error) {
    // Define schema if model doesn't exist yet
    const UserSchema = new mongoose.Schema(
      {
        name: {
          type: String,
          required: [true, "Please add a name"],
        },
        email: {
          type: String,
          required: [true, "Please add an email"],
          unique: true,
          match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            "Please add a valid email",
          ],
        },
        password: {
          type: String,
          required: [true, "Please add a password"],
          minlength: 6,
          select: false,
        },
        isAdmin: {
          type: Boolean,
          default: false,
        },
      },
      {
        timestamps: true,
      }
    );

    return mongoose.model<UserDocument>("User", UserSchema);
  }
}

// Get User model with DB connection
export async function getUserModelWithDB(): Promise<
  mongoose.Model<UserDocument>
> {
  await connectDB();
  return getUserModel();
}

// Encrypt password before saving
export function encryptPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

// Method to check if password matches
export function matchPassword(
  enteredPassword: string,
  storedPassword: string
): boolean {
  return bcrypt.compareSync(enteredPassword, storedPassword);
}

// Create and export User model - using mongoose.models to check if model already exists
const User =
  (mongoose.models.User as IUserModel) ||
  mongoose.model<IUserDocument, IUserModel>(
    "User",
    new mongoose.Schema(
      {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Recipe" }],
      },
      { timestamps: true }
    )
  );

export default User;
