"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "./ui/button";

const event = "loopr-cookie-notice";
const key = "loopr-cookie-notice-v1";
let dismissed = false;

function subscribe(callback: () => void) {
  window.addEventListener(event, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(event, callback); window.removeEventListener("storage", callback); };
}

function acknowledged() {
  try { return dismissed || localStorage.getItem(key) === "accepted"; }
  catch { return dismissed; }
}

function accept() {
  dismissed = true;
  try { localStorage.setItem(key, "accepted"); } catch {}
  window.dispatchEvent(new Event(event));
}

export function CookieNotice() {
  const accepted = useSyncExternalStore(subscribe, acknowledged, () => true);
  if (accepted) return null;
  return <aside className="cookie-notice" aria-label="Cookie notice"><p>Loopr uses essential cookies. See the <Link href="/privacy">Privacy Policy</Link>.</p><Button onClick={accept}>Accept cookies</Button></aside>;
}
