import { redirect } from "next/navigation";
import { Onboarding } from "@/components/onboarding";
import { getProfile, requireSession } from "@/lib/account";
import { database } from "@/lib/database";

export default async function OnboardingPage() {
  const { session, auth, requestHeaders } = await requireSession();
  if (await getProfile(session.user.id)) redirect("/home");
  const [accounts, suggestions] = await Promise.all([
    auth.api.listUserAccounts({ headers: requestHeaders }),
    database().query<{ id: string; display_name: string; username: string }>(
      "SELECT id, display_name, username FROM loopr.profiles WHERE NOT is_protected ORDER BY is_verified DESC, created_at DESC LIMIT 3",
    ),
  ]);
  return <Onboarding name={session.user.name} needsPassword={!accounts.some((account) => account.providerId === "credential")} suggestions={suggestions.rows} />;
}
