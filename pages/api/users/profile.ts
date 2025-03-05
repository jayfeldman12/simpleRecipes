import { NextApiResponse } from "next";
import User from "../models/User";
import { AuthNextApiRequest, connectDB, withProtect } from "../utils/auth";

// @desc    Get or update user profile
// @route   GET/PUT /api/users/profile
// @access  Private
async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  // Connect to the database
  await connectDB();

  // Only allow GET and PUT methods for this endpoint
  if (req.method !== "GET" && req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // GET - Return user profile
    if (req.method === "GET") {
      return res.json({
        _id: user._id,
        username: user.username,
      });
    }

    // PUT - Update user profile
    if (req.method === "PUT") {
      user.username = req.body.username || user.username;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      return res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        token: req.headers.authorization?.split(" ")[1], // Return the same token
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

export default withProtect(handler);
