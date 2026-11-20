"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { birthday, birthValue } from "@/lib/form-data";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { DateOfBirth } from "./date-of-birth";

export function Welcome({ google, mail, configured }: { google: boolean; mail: boolean; configured: boolean }) {
  const [screen, setScreen] = useState<"login" | "register" | "reset" | null>(null);
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function open(next: typeof screen) {
    setScreen(next);
    setStep(1);
    setVisible(false);
    setError("");
    setNotice("");
  }

  async function googleSignIn() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/home", newUserCallbackURL: "/onboarding", errorCallbackURL: "/welcome?error=google" });
      if (result.error) setError("Could not start Google sign-in.");
    } catch {
      setError("Could not reach Google sign-in. Try again.");
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    if (screen !== "reset" && step === 1) {
      if (screen === "register") {
        const selected = birthday.safeParse(birthValue(data));
        if (!selected.success) { setError(selected.error.issues[0].message); return; }
        setDate(selected.data);
      }
      setStep(2);
      return;
    }
    if (!configured) { setError("Accounts are unavailable while Loopr is being set up."); return; }
    setBusy(true);
    try {
      if (screen === "login") {
        const response = await fetch("/api/auth/sign-in/identifier", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password: data.get("password") }) });
        if (!response.ok) setError(response.status === 403 ? "Verify your email before signing in." : response.status === 429 ? "Too many attempts. Try again shortly." : "That email, username or password didn’t match.");
        else window.location.assign("/home");
      } else if (screen === "register") {
        if (!mail) { setError("Email registration is unavailable."); return; }
        const value = String(data.get("password") ?? "");
        if (value !== data.get("confirmPassword")) { setError("Passwords do not match."); return; }
        try { sessionStorage.setItem("loopr-birthday", date); } catch {}
        const result = await authClient.signUp.email({ name, email: identifier, password: value, callbackURL: "/onboarding" });
        if (result.error) setError("Could not register. Check your details and try again.");
        else setNotice("Check your inbox for a verification link to finish creating your account.");
      } else {
        const result = await authClient.requestPasswordReset({ email: String(data.get("email")), redirectTo: "/reset-password" });
        if (result.error) setError("Could not request a reset. Try again later.");
        else setNotice("If that email has an account, you’ll receive a password reset link.");
      }
    } catch { setError("Loopr could not connect. Try again."); }
    finally { setBusy(false); }
  }

  return <div className="welcome-page">
    <header className="welcome-top">
      <span className="public-wordmark">Loopr</span>
      <Link href="/about">About</Link>
    </header>
    <main className="welcome-layout">
      <div className="welcome-mark"><Image src="/logo.svg" width={180} height={180} alt="" priority /></div>
      <div className="welcome-content">
        <h1>Happening now</h1>
        <h2>Join today.</h2>
        <div className="welcome-actions">
          <Button variant="outline" disabled={!google} onClick={() => void googleSignIn()}><Image src="/google.svg" width={18} height={18} alt="" /> Sign up with Google</Button>
          <span className="auth-divider">or</span>
          <Button disabled={!configured || !mail} onClick={() => open("register")}>Create account</Button>
          <p>By creating an account, you agree to the <Link href="/terms">Terms of Service</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>
          <h3>Already have an account?</h3>
          <Button variant="outline" disabled={!configured} onClick={() => open("login")}>Sign in</Button>
          {!configured && <p role="status">Accounts will open once setup is complete.</p>}
        </div>
      </div>
    </main>
    <footer className="welcome-footer"><Link href="/terms">Terms of Service</Link><Link href="/privacy">Privacy Policy</Link><Link href="/refunds">Refund Policy</Link><Link href="/cookies">Cookies</Link><Link href="/guidelines">Community Guidelines</Link><span>© 2026 Loopr</span></footer>
    <Modal className="auth-dialog" headerMark={<Image src="/logo.svg" width={44} height={44} alt="" />} open={screen !== null} onOpenChange={(next) => { if (!next) open(null); }} title={screen === "register" ? "Create your account" : screen === "reset" ? "Reset your password" : "Sign in to Loopr"}>
      <div className="auth-modal-body">
        {screen === "register" && !notice && <p className="auth-progress">Step {step} of 2</p>}
        {notice ? <p className="form-success" role="status">{notice}</p> : <>
          {screen === "login" && step === 1 && google && <><Button variant="outline" disabled={busy} onClick={() => void googleSignIn()}><Image src="/google.svg" width={18} height={18} alt="" /> Continue with Google</Button><span className="auth-divider">or</span></>}
          <form className="auth-form" data-auth-step={step} onSubmit={submit}>
            {screen === "reset" ? <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              : step === 1 ? <>
                {screen === "register" && <label>Name<input name="name" autoComplete="name" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} /></label>}
                <label>{screen === "register" ? "Email" : "Email or username"}<input name="identifier" type={screen === "register" ? "email" : "text"} autoComplete={screen === "register" ? "email" : "username"} autoCapitalize="none" required maxLength={254} value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></label>
                {screen === "register" && <DateOfBirth initial={date} />}
              </> : <>
                <p className="auth-identifier"><span>{identifier}</span><button type="button" onClick={() => { setStep(1); setError(""); }}><ArrowLeft size={15} /> Edit</button></p>
                <label>Password<span className="password-field"><input name="password" type={visible ? "text" : "password"} autoComplete={screen === "register" ? "new-password" : "current-password"} minLength={screen === "register" ? 12 : undefined} maxLength={128} required /><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
                {screen === "register" && <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>}
              </>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? "Please wait…" : screen === "reset" ? "Send reset link" : step === 1 ? "Next" : screen === "register" ? "Create account" : "Log in"}</Button>
          </form>
          {screen === "login" && <Button variant="outline" disabled={!mail} onClick={() => open("reset")}>Forgot password?</Button>}
          {screen === "login" && step === 1 && <p className="auth-switch">New to Loopr? <button type="button" onClick={() => open("register")}>Create an account</button></p>}
          {screen === "reset" && <p className="auth-switch"><button type="button" onClick={() => open("login")}>Back to sign in</button></p>}
        </>}
      </div>
    </Modal>
  </div>;
}
