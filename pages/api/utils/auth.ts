import jwt from "jsonwebtoken";
import { NextApiRequest, NextApiResponse } from "next";
import User from "../models/User";
import { IUserDocument } from "../models/types";
import dbConnect from "./dbConnect";

// Define extended type for request that includes user
export interface AuthNextApiRequest extends NextApiRequest {
  user?: IUserDocument;
}

// Check if JWT_SECRET is configured
const checkJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error(
      "⚠️ WARNING: JWT_SECRET is not defined in environment variables!"
    );
    console.error("Authentication will fail until this is resolved.");
    return false;
  }
  return true;
};

// Run the check when this module is imported
checkJwtSecret();

// Connect to MongoDB - using our new dbConnect function
export const connectDB = async () => {
  return await dbConnect();
};

// Generate a JWT token
export const generateToken = (id: string): string | null => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("Failed to generate token: JWT_SECRET is not defined");
    return null;
  }

  try {
    return jwt.sign({ id }, secret, {
      expiresIn: "30d",
    });
  } catch (error) {
    console.error("Error generating JWT token:", error);
    return null;
  }
};

// Verify a JWT token
export const verifyToken = (token: string): { id: string } | null => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("Failed to verify token: JWT_SECRET is not defined");
    return null;
  }

  try {
    return jwt.verify(token, secret) as { id: string };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("Invalid JWT token:", error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.error("JWT token expired:", error.message);
    } else {
      console.error("JWT verification error:", error);
    }
    return null;
  }
};

// Middleware to protect routes in Express-style middleware
export const protect = async (
  req: AuthNextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  await connectDB();

  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        id: string;
      };

      // Get user from database (exclude password)
      const user = await User.findById(decoded.id).select("-password");

      // Check if user exists
      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      // Set user in request
      req.user = user;

      next();
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(401).json({ message: "Not authorized" });
      return;
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
    return;
  }
};

// Middleware to protect Next.js API routes
export const withProtect = (
  handler: (req: AuthNextApiRequest, res: NextApiResponse) => Promise<void>,
  optional: boolean = false
) => {
  return async (req: AuthNextApiRequest, res: NextApiResponse) => {
    try {
      // Connect to MongoDB first
      await connectDB();

      // Check if the request has an authorization header with a Bearer token
      if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer")
      ) {
        console.log("No authorization token provided");

        // If auth is optional, proceed without user
        if (optional) {
          return handler(req, res);
        }

        return res.status(401).json({
          success: false,
          message: "Not authorized, no token",
        });
      }

      // Extract the token
      const token = req.headers.authorization.split(" ")[1];
      console.log("Token received, verifying");

      // Verify the token
      const decoded = verifyToken(token);
      if (!decoded) {
        console.error("Token verification failed");

        // If auth is optional, proceed without user
        if (optional) {
          return handler(req, res);
        }

        return res.status(401).json({
          success: false,
          message: "Not authorized, token verification failed",
        });
      }

      // Get user from the token
      console.log(`Looking up user with ID: ${decoded.id}`);
      const user = await User.findById(decoded.id).select("-password");

      // Check if user exists
      if (!user) {
        console.error(`User not found for token with ID: ${decoded.id}`);

        // If auth is optional, proceed without user
        if (optional) {
          return handler(req, res);
        }

        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Attach user to request
      req.user = user;

      // Call the handler
      return handler(req, res);
    } catch (error) {
      // Check for MongoDB timeout errors
      if (
        error instanceof Error &&
        error.name === "MongooseError" &&
        error.message.includes("timed out")
      ) {
        console.error("MongoDB operation timed out:", error);
        return res.status(503).json({
          success: false,
          message: "Database operation timed out. Please try again.",
        });
      }

      console.error("Error in authentication middleware:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during authentication",
      });
    }
  };
};
