import { NextApiRequest, NextApiResponse } from "next";
import User from "../../../backend/src/models/User";
import { connectDB, generateToken } from "../utils/auth";

// @desc    Register new user
// @route   POST /api/users
// @access  Public
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Connect to the database
  await connectDB();

  // Only allow POST method for this endpoint
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({
      username,
      password,
    });

    if (user) {
      return res.status(201).json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id.toString()),
      });
    } else {
      return res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}
