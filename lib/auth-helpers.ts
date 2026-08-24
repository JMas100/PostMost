import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Extracts the signed-in user's id from a NextAuth session, throwing for server actions
 *  that require auth (the exception surfaces as a rejected action call on the client). */
export function getUserId(session: { user?: { id?: string } } | null): string {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Fetches the current session and extracts the user id in one call -- the pattern nearly
 *  every server action opens with. Throws the same way getUserId does when signed out. */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  return getUserId(session);
}
