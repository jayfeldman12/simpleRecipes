import mongoose, { Schema } from "mongoose";
import dbConnect from "../utils/dbConnect";

// Connect to the database before defining the model
dbConnect();

export interface TagDocument extends mongoose.Document {
  name: string;
  createdAt: Date;
}

export interface TagModel extends mongoose.Model<TagDocument> {
  // Static methods would go here
}

// Create a tag schema
const TagSchema = new Schema<TagDocument>(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      unique: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create and export Tag model - using mongoose.models to check if model already exists
const Tag =
  (mongoose.models.Tag as TagModel) ||
  mongoose.model<TagDocument, TagModel>("Tag", TagSchema);

export default Tag;
