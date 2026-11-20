import { z } from "zod";

function browserPushEndpoint(value: string) {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  const host = url.hostname;
  return url.protocol === "https:" && !url.username && !url.password && !url.port
    && !url.hash && url.pathname.length > 1 && (
      host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com"
      || host === "web.push.apple.com" || host.endsWith(".push.apple.com")
      || host.endsWith(".notify.windows.com")
    );
}

export const endpointSchema = z.url().max(2048).refine(browserPushEndpoint);
export const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }),
});

export function pushConfiguration() {
  const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  return VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY
    ? { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY }
    : undefined;
}
