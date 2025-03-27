import { NextApiRequest, NextApiResponse } from "next";
import Tag from "../models/Tag";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

// @desc    Get all tags or create a new tag
// @route   GET|POST /api/tags
// @access  Public (GET), Protected (POST)
async function handler(
  req: NextApiRequest | AuthNextApiRequest,
  res: NextApiResponse
) {
  // Connect to the database
  await connectDB();

  // GET - Fetch all tags
  if (req.method === "GET") {
    try {
      const tags = await Tag.find().sort({ name: 1 });
      return res.status(200).json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // POST - Create a new tag (protected route)
  if (req.method === "POST") {
    // Check if user is authenticated
    if (!(req as AuthNextApiRequest).user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Tag name is required" });
      }

      // Check if tag already exists (case insensitive)
      const existingTag = await Tag.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (existingTag) {
        return res
          .status(400)
          .json({ message: "Tag with this name already exists" });
      }

      // Create a new tag
      const tag = await Tag.create({ name });
      return res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // Method not allowed
  return res.status(405).json({ message: "Method not allowed" });
}

// Export default handler based on HTTP method
export default async function (
  req: NextApiRequest | AuthNextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return handler(req, res);
  } else if (req.method === "POST") {
    return withProtect(handler as any)(req as AuthNextApiRequest, res);
  } else {
    return handler(req, res);
  }
}
