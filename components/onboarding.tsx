"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { finishOnboarding } from "@/app/account-actions";
import { birthday, birthValue, password, username } from "@/lib/form-data";
import { DateOfBirth } from "./date-of-birth";
import { Button } from "./ui/button";

type Suggestion = { id: string; username: string; display_name: string };
const titles = ["Choose your username", "Add a profile photo", "Write your bio", "Find people to follow"];

export function Onboarding({ name, needsPassword, suggestions }: { name: string; needsPassword: boolean; suggestions: Suggestion[] }) {
  const [result, action, pending] = useActionState(finishOnboarding, {});
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [savedDate, setSavedDate] = useState("");
  const [handle, setHandle] = useState("");
  const [availability, setAvailability] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const candidate = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "loopr";
  const steps = needsPassword ? ["Set a password", ...titles] : titles;
  const active = steps[step];

  useEffect(() => {
    try { setSavedDate(sessionStorage.getItem("loopr-birthday") ?? ""); } catch {}
  }, []);

  useEffect(() => {
    const parsed = username.safeParse(handle);
    if (!parsed.success) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/username?value=${encodeURIComponent(parsed.data)}`, { signal: controller.signal });
        if (response.ok) setAvailability((await response.json()).available === true ? "Available" : "Already taken");
      } catch {}
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [handle]);

  function next() {
    if (!form.current) return;
    const data = new FormData(form.current);
    if (active === "Set a password") {
      if (!password.safeParse(data.get("password")).success) { setError("Use a password between 12 and 128 characters."); return; }
      if (data.get("password") !== data.get("confirmPassword")) { setError("Passwords do not match."); return; }
    }
    if (active === titles[0]) {
      const date = birthday.safeParse(birthValue(data));
      if (!date.success) { setError(date.error.issues[0].message); return; }
      if (!username.safeParse(handle).success || availability === "Already taken") { setError("Choose an available username using 3–30 letters, numbers or underscores."); return; }
    }
    setError("");
    setStep(step + 1);
  }

  return <main className="auth-standalone">
    <Image src="/logo.svg" alt="Loopr" width={44} height={44} />
    <p className="step-count">Step {step + 1} of {steps.length}</p>
    <h1>{active}</h1>
    <form className="auth-form" ref={form} onSubmit={(event) => {
      event.preventDefault();
      if (step < steps.length - 1) { next(); return; }
      const fields = new FormData(event.currentTarget);
      try { sessionStorage.removeItem("loopr-birthday"); } catch {}
      startTransition(() => action(fields));
    }} noValidate>
      {needsPassword && <div className="step-fields" hidden={active !== "Set a password"}>
        <p>Use this password to sign in with your email address.</p>
        <label>Password<input type="password" name="password" autoComplete="new-password" /></label>
        <label>Confirm password<input type="password" name="confirmPassword" autoComplete="new-password" /></label>
      </div>}
      <div className="step-fields" hidden={active !== titles[0]}>
        <label>Display name<input name="displayName" defaultValue={name.slice(0, 50)} maxLength={50} /></label>
        <label>Username<input name="username" autoCapitalize="none" autoComplete="username" value={handle} onChange={(event) => { setHandle(event.target.value); setAvailability(""); }} maxLength={30} /></label>
        {availability && <p role="status">{availability}</p>}
        <div className="suggested-handles">{[candidate, `${candidate}_`, `${candidate}23`].filter((item) => item.length >= 3).map((item) =>
          <Button variant="outline" key={item} onClick={() => { setHandle(item); setAvailability(""); }}>@{item}</Button>)}</div>
        <DateOfBirth key={savedDate} initial={savedDate} />
        <p>Your birthday stays private.</p>
      </div>
      <div className="step-fields" hidden={active !== titles[1]}><label>Profile photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label><p>Optional. JPEG, PNG, or WebP up to 4 MB.</p></div>
      <div className="step-fields" hidden={active !== titles[2]}><label>Bio<textarea name="bio" maxLength={160} rows={3} /></label><p>Optional. Up to 160 characters.</p></div>
      <div className="step-fields" hidden={active !== titles[3]}>
        {suggestions.length ? suggestions.map((person) => <label className="check-row" key={person.id}><input type="checkbox" name="follow" value={person.id} /> {person.display_name} (@{person.username})</label>)
          : <p>You can find people after you finish setting up your account.</p>}
      </div>
      {(error || result.error) && <p className="form-error" role="alert">{error || result.error}</p>}
      <div className="auth-step-actions">
        {step > 0 && <Button variant="outline" disabled={pending} onClick={() => { setStep(step - 1); setError(""); }}>Back</Button>}
        {step < steps.length - 1 && <Button key="next" onClick={next}>Next</Button>}
        {step === steps.length - 1 && <Button key="finish" type="submit" disabled={pending}>{pending ? "Saving…" : "Go to Home"}</Button>}
      </div>
    </form>
  </main>;
}
