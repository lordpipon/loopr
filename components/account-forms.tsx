"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { changeEmail, changePassword, changeUsername, saveProfile, unlinkGoogle, type FormResult } from "@/app/account-actions";
import { authClient } from "@/lib/auth-client";
import type { MemberProfile } from "@/lib/account";
import { Button } from "./ui/button";

function AccountForm({ title, submit, action, children }: {
  title: string; submit: string; children: ReactNode;
  action: (previous: FormResult, data: FormData) => Promise<FormResult>;
}) {
  const [result, formAction, pending] = useActionState(action, {});
  return <section className="account-form-section">
    <h2>{title}</h2>
    <form className="auth-form" action={formAction}>
      {children}
      {result.error && <p role="alert" className="form-error">{result.error}</p>}
      {result.success && <p role="status" className="form-success">{result.success}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : submit}</Button>
    </form>
  </section>;
}

function CurrentPassword() {
  return <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label>;
}

export function AccountForms({ email, username, nextChange, google, linked, mail }: {
  email: string; username: string; nextChange: string | null; google: boolean; linked: boolean; mail: boolean;
}) {
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  async function connect() {
    setLinking(true);
    setError("");
    try {
      const result = await authClient.linkSocial({ provider: "google", callbackURL: "/settings/account", errorCallbackURL: "/settings/account?error=google" });
      if (result.error) setError("Could not connect Google.");
    } catch { setError("Could not connect to Google."); }
    finally { setLinking(false); }
  }
  return <>
    <AccountForm title="Username" submit="Save username" action={changeUsername}>
      <label>Username<input name="username" autoComplete="username" defaultValue={username} minLength={3} maxLength={30} required /></label>
      <p>Change your username once every seven days. {nextChange && `Your next change is available ${nextChange}.`}</p>
    </AccountForm>
    <AccountForm title="Change password" submit="Change password" action={changePassword}>
      <CurrentPassword />
      <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
    </AccountForm>
    {mail ? <AccountForm title="Change email" submit="Send confirmation" action={changeEmail}>
      <p>Current address: {email}</p>
      <label>New email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <CurrentPassword />
    </AccountForm> : <section className="account-form-section"><h2>Email</h2><p>{email}</p><p>Email changes are unavailable until email delivery is configured.</p></section>}
    {linked ? <AccountForm title="Google account connected" submit="Disconnect Google" action={unlinkGoogle}><CurrentPassword /></AccountForm>
      : google && <section className="account-form-section"><h2>Google account</h2><Button disabled={linking} onClick={() => void connect()}>Link Google</Button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>}
  </>;
}

export function ProfileForm({ profile }: { profile: Omit<MemberProfile, "username_changed_at"> }) {
  return <AccountForm title="Public profile" action={saveProfile} submit="Save profile">
    <label>Display name<input name="displayName" defaultValue={profile.display_name} maxLength={50} required /></label>
    <label>Pronouns<input name="pronouns" placeholder="e.g. she/her, he/him, they/them" defaultValue={profile.pronouns} maxLength={40} /></label>
    <label>Bio<textarea name="bio" defaultValue={profile.bio} maxLength={160} rows={3} /></label>
    <label>Location<input name="location" defaultValue={profile.location ?? ""} maxLength={100} /></label>
    <label>Website<input type="url" name="website" placeholder="https://" defaultValue={profile.website ?? ""} maxLength={300} /></label>
    <label>Profile picture<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
    {profile.avatar_url && <label className="check-row"><input name="removePhoto" type="checkbox" /> Remove current photo</label>}
  </AccountForm>;
}

export function SignOut({ handle }: { handle: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) setFailed(true);
      else { router.replace("/"); router.refresh(); }
    } catch { setFailed(true); }
    finally { setBusy(false); }
  }
  return <><button disabled={busy} onClick={() => void signOut()}>Log out @{handle}</button>
    {failed && <small role="alert">Could not log out. Try again.</small>}
  </>;
}

export function SettingsLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="button button-outline settings-route-link" href={href}>{children}</Link>;
}
