import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "../../utils/database";

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        await connectDB();

        // Import User model dynamically to avoid issues with mongoose models
        const { default: User } = await import("../../api/models/User");

        // Find user by username
        const user = await User.findOne({ username: credentials.username });

        if (!user) {
          return null;
        }

        // Verify password with type assertion for safety
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password as string
        );

        if (!isValid) {
          return null;
        }

        // Return user object that will be passed to JWT callback
        return {
          id: (user._id as any).toString(),
          name: user.username as string,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Ensure we have the user ID in the token
        token.id = user.id;
        token.userId = user.id; // Add alternative field for redundancy
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Ensure we have user ID in the session
        session.user.id = token.id as string;
        // Add alternative fields for redundancy and backward compatibility
        (session.user as any).userId = token.id;
        (session.user as any)._id = token.id;
      }
      console.log("Session created:", session);
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
});
