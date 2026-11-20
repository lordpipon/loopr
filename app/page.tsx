import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Welcome } from "@/components/welcome";
import { authEnabled, emailConfigured, getAuth, googleConfigured } from "@/lib/auth-config";
export const dynamic = "force-dynamic";

export default async function Home() {
  if (!authEnabled()) return <Welcome google={false} mail={false} configured={false} />;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session?.user.emailVerified) redirect("/home");
  return <Welcome google={googleConfigured()} mail={emailConfigured()} configured />;
}
