import { NextApiRequest, NextApiResponse } from "next";
import User from "../../../backend/src/models/User";
import { connectDB, generateToken } from "../utils/auth";

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method for this endpoint
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Connect to the database first
    await connectDB();

    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Please provide username and password" });
    }

    console.log(`Attempting to find user by username: ${username}`);

    // Check for username with timeout handling
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Match password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log(`Password mismatch for user: ${username}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user._id.toString());

    if (!token) {
      console.error("Failed to generate authentication token");
      return res.status(500).json({ message: "Authentication error" });
    }

    console.log(`User logged in successfully: ${username}`);

    return res.json({
      _id: user._id,
      username: user.username,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);

    // Check specifically for timeout errors
    if (
      error instanceof Error &&
      error.name === "MongooseError" &&
      error.message.includes("timed out")
    ) {
      return res.status(503).json({
        message: "Database operation timed out. Please try again.",
        error: "TIMEOUT",
      });
    }

    return res.status(500).json({
      message: "Server error during login",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
