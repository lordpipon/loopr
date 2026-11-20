import Link from "next/link";
import { PushSettings } from "@/components/push-settings";
import { requireMember } from "@/lib/account";
import { pushConfiguration } from "@/lib/push-config";

export default async function NotificationSettings() {
  await requireMember();
  return <main className="auth-standalone account-page">
    <Link href="/home">← Home</Link><h1>Notifications</h1><PushSettings keyValue={pushConfiguration()?.publicKey} />
  </main>;
}
