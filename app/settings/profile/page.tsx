import Link from "next/link";
import { ProfileForm } from "@/components/account-forms";
import { requireMember } from "@/lib/account";

export default async function ProfileSettings() {
  const { profile } = await requireMember();
  const { username_changed_at: _changed, ...publicFields } = profile;
  return <main className="auth-standalone account-page">
    <Link href="/home">← Home</Link><h1>Edit profile</h1><ProfileForm profile={publicFields} />
  </main>;
}
