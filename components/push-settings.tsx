"use client";

import { useEffect, useState } from "react";
import { removeSubscription, saveSubscription, testPush } from "@/app/push-actions";
import { Button } from "./ui/button";

function supported() {
  return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function decodeKey(key: string) {
  return Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
}

export function PushSettings({ keyValue }: { keyValue?: string }) {
  const [device, setDevice] = useState<PushSubscription | null>(null);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!supported()) return;
    setAvailable(true);
    void navigator.serviceWorker.getRegistration().then(async (registration) => {
      if (registration) setDevice(await registration.pushManager.getSubscription());
    }).catch(() => {});
  }, []);

  async function manage(mode: "enable" | "disable" | "test") {
    if (!keyValue) return;
    setBusy(true);
    setNotice("");
    try {
      if (mode === "enable") {
        if (await Notification.requestPermission() !== "granted") {
          setNotice("Allow notifications in your browser to enable push.");
          return;
        }
        await navigator.serviceWorker.register("/loopr-worker.js");
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(keyValue) });
        const result = await saveSubscription(subscription.toJSON());
        if (result.error) {
          if (!existing) await subscription.unsubscribe();
          setNotice(result.error);
        } else {
          setDevice(subscription);
          setNotice("Browser push is enabled on this device.");
        }
      } else if (device && mode === "disable") {
        const result = await removeSubscription(device.endpoint);
        if (result.error) { setNotice(result.error); return; }
        await device.unsubscribe();
        setDevice(null);
        setNotice("Browser push is disabled.");
      } else if (device) {
        const result = await testPush(device.endpoint);
        setNotice(result.error ?? "Test notification sent.");
      }
    } catch { setNotice("The browser could not update notifications. Try again."); }
    finally { setBusy(false); }
  }

  return <section className="account-form-section">
    <h2>Browser push notifications</h2>
    <p>{!keyValue ? "Push is unavailable until the server is configured." : !available ? "Browser push requires a supported browser and a secure connection." : "Manage notifications on this device."}</p>
    {keyValue && available && <div className="suggested-handles">
      <Button disabled={busy} onClick={() => void manage(device ? "disable" : "enable")}>{device ? "Disable push" : "Enable push"}</Button>
      {device && <Button variant="outline" disabled={busy} onClick={() => void manage("test")}>Send a test</Button>}
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
