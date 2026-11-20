import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { authEnabled, getAuth } from "./auth-config";
import { database } from "./database";

export type MemberProfile = {
  id: string; username: string; display_name: string; avatar_url: string | null; bio: string;
  pronouns: string; website: string | null; location: string | null; is_verified: boolean;
  username_changed_at: Date | null;
};

export async function requireSession() {
  await connection();
  if (!authEnabled()) redirect("/welcome");
  const requestHeaders = await headers();
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user.emailVerified) redirect("/");
  return { auth, session, requestHeaders };
}

export async function getProfile(id: string) {
  const result = await database().query<MemberProfile>(
    "SELECT id, username, display_name, avatar_url, bio, pronouns, website, location, is_verified, username_changed_at FROM loopr.profiles WHERE id = $1",
    [id],
  );
  return result.rows[0];
}

export async function requireMember() {
  const context = await requireSession();
  const profile = await getProfile(context.session.user.id);
  if (!profile) redirect("/onboarding");
  return { ...context, profile };
}
