"use server";

import { sendNotification, WebPushError } from "web-push";
import { requireMember } from "@/lib/account";
import { asMember } from "@/lib/database";
import { endpointSchema, pushConfiguration, subscriptionSchema } from "@/lib/push-config";

export async function saveSubscription(input: unknown) {
  const { profile } = await requireMember();
  const sub = subscriptionSchema.safeParse(input);
  if (!sub.success || !pushConfiguration()) return { error: "This browser subscription is unavailable." };
  const { endpoint, keys } = sub.data;
  const saved = await asMember(profile.id, async (client) => {
    // An existing endpoint keeps its account and stored device keys.
    await client.query(
      "INSERT INTO loopr.push_subscriptions (endpoint, profile_id, p256dh, auth_key) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [endpoint, profile.id, keys.p256dh, keys.auth],
    );
    const { rowCount } = await client.query(
      "SELECT 1 FROM loopr.push_subscriptions WHERE endpoint=$1 AND p256dh=$2 AND auth_key=$3",
      [endpoint, keys.p256dh, keys.auth],
    );
    return rowCount === 1;
  });
  return saved ? { success: true } : { error: "This subscription is already in use. Clear the site’s notification permissions and try again." };
}

export async function removeSubscription(input: unknown) {
  const { profile } = await requireMember();
  const endpoint = endpointSchema.safeParse(input);
  if (!endpoint.success) return { error: "Invalid subscription." };
  await asMember(profile.id, (client) => client.query("DELETE FROM loopr.push_subscriptions WHERE endpoint=$1", [endpoint.data]));
  return { success: true };
}

export async function testPush(input: unknown) {
  const { profile } = await requireMember();
  const endpoint = endpointSchema.safeParse(input);
  const vapidDetails = pushConfiguration();
  if (!endpoint.success || !vapidDetails) return { error: "Enable browser push first." };
  const { rows: [row] } = await asMember(profile.id, (client) => client.query<{ endpoint: string; p256dh: string; auth_key: string }>(
    `UPDATE loopr.push_subscriptions SET last_test_at=now()
     WHERE endpoint=$1 AND (last_test_at IS NULL OR last_test_at <= now() - interval '60 seconds')
     RETURNING endpoint, p256dh, auth_key`, [endpoint.data],
  ));
  if (!row) return { error: "Enable browser push first or wait a minute between test messages." };
  try {
    await sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
      JSON.stringify({ title: "Loopr", body: "Browser notifications are working." }), { TTL: 60, vapidDetails, timeout: 5000 });
    return { success: true };
  } catch (error) {
    if (error instanceof WebPushError && [404, 410].includes(error.statusCode)) await removeSubscription(endpoint.data);
    return { error: "Push could not be delivered. Re-enable browser push and try again." };
  }
}
