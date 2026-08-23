/** Extracts the signed-in user's id from a NextAuth session, throwing for server actions
 *  that require auth (the exception surfaces as a rejected action call on the client). */
export function getUserId(session: { user?: { id?: string } } | null): string {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}
