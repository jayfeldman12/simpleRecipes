import { NextApiRequest } from "next";
import { Session } from "next-auth";

declare module "next-auth/react" {
  /**
   * Gets the session from a request object
   * (server-side only)
   */
  export function getSession(options: {
    req: NextApiRequest;
  }): Promise<Session | null>;
}
