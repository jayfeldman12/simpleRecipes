import jwt from "jsonwebtoken";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { connectDB as connectToDB } from "../../utils/database";

// Extended request with user info
export interface AuthNextApiRequest extends NextApiRequest {
  user?: { _id: string };
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

// Connect to database
export const connectDB = async (): Promise<void> => {
  try {
    await connectToDB();
  } catch (error) {
    console.error("Database connection error:", error);
    throw new Error("Failed to connect to database");
  }
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

// Middleware to protect routes
export function withProtect(
  handler: (req: AuthNextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: AuthNextApiRequest, res: NextApiResponse) => {
    try {
      // Check for session
      const session = await getSession({ req });

      if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Add user to request
      req.user = { _id: session.user.id };

      // Call the original handler
      return handler(req, res);
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
