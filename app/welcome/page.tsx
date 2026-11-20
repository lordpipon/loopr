import { Welcome } from "@/components/welcome";
import { authEnabled, emailConfigured, googleConfigured } from "@/lib/auth-config";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error;
  return <>
    {error && <p className="auth-page-notice" role="alert">Google sign-in could not finish. If you already have an account, sign in with your password and link Google in Settings.</p>}
    <Welcome google={authEnabled() && googleConfigured()} mail={authEnabled() && emailConfigured()} configured={authEnabled()} />
  </>;
}
