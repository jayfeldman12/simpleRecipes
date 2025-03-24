import { NextApiRequest } from "next";
import "next-auth";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
    };
  }
}

// Declare the next-auth/react module
declare module "next-auth/react" {
  export function useSession(): {
    data: import("next-auth").Session | null;
    status: "loading" | "authenticated" | "unauthenticated";
  };

  export function signIn(provider?: string, options?: any): Promise<any>;
  export function signOut(options?: any): Promise<any>;

  // Server-side function
  export function getSession(options?: {
    req: NextApiRequest;
  }): Promise<import("next-auth").Session | null>;
}
