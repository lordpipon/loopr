import Link from "next/link";
import { AccountForms } from "@/components/account-forms";
import { requireMember } from "@/lib/account";
import { emailConfigured, googleConfigured } from "@/lib/auth-config";

export default async function AccountSettings({ searchParams }: { searchParams: Promise<{ error?: string; passwordChanged?: string }> }) {
  const result = await searchParams;
  const { profile, session, auth, requestHeaders } = await requireMember();
  const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
  const next = profile.username_changed_at && new Date(profile.username_changed_at.getTime() + 604_800_000);
  const nextChange = next && next.getTime() > Date.now() ? next.toISOString().slice(0, 10) + " UTC" : null;
  return <main className="auth-standalone account-page">
    <Link href="/home">← Home</Link><h1>Account and sign-in</h1>
    {result.error && <p role="alert" className="form-error">Google could not be linked. Check that it isn’t connected to another Loopr account.</p>}
    {result.passwordChanged === "1" && <p role="status" className="form-success">Password changed. Other sessions were signed out.</p>}
    <AccountForms email={session.user.email} username={profile.username} nextChange={nextChange} google={googleConfigured()} linked={accounts.some((account) => account.providerId === "google")} mail={emailConfigured()} />
  </main>;
}
