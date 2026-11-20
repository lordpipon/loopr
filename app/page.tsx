import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Welcome } from "@/components/welcome";
import { authEnabled, emailConfigured, getAuth, googleConfigured } from "@/lib/auth-config";
export const dynamic = "force-dynamic";

export default async function Home() {
  if (!authEnabled()) return <Shell />;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session?.user.emailVerified) redirect("/home");
  return <Welcome google={googleConfigured()} mail={emailConfigured()} demo={false} />;
}
