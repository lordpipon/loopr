import { ResetPassword } from "@/components/reset-password";
import { authEnabled } from "@/lib/auth-config";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="auth-standalone"><h1>Reset your password</h1>
    <ResetPassword token={authEnabled() && typeof token === "string" ? token : undefined} />
  </main>;
}
