"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export function ResetPassword({ token }: { token?: string }) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const newPassword = String(values.get("password"));
    if (newPassword !== values.get("confirmation")) { setError("Passwords do not match."); return; }
    setError("");
    setBusy(true);
    try {
      const result = await authClient.resetPassword({ token, newPassword });
      if (result.error) setError("The reset link is invalid or expired.");
      else setSaved(true);
    } catch { setError("Could not reset the password. Try again."); }
    finally { setBusy(false); }
  }
  if (!token || saved) return <><p>{saved ? "Your password was reset." : "Your reset link is invalid or expired."}</p><Link href="/welcome">Back to sign in</Link></>;
  return <form className="auth-form" onSubmit={submit}>
    <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
    <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
    {error && <p role="alert" className="form-error">{error}</p>}
    <Button type="submit" disabled={busy}>Reset password</Button>
  </form>;
}
