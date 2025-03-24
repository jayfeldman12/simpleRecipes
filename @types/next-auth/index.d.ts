// Declaration file for next-auth
import { NextApiRequest } from "next";

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

declare module "next-auth/react" {
  export interface UseSessionOptions {
    required?: boolean;
    onUnauthenticated?: () => void;
  }

  export function useSession(options?: UseSessionOptions): {
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
