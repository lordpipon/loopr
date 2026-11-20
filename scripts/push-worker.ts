import { loadEnvConfig } from "@next/env";
import { setTimeout } from "node:timers/promises";
import { Pool } from "pg";
import { sendNotification, WebPushError } from "web-push";
import { endpointSchema, pushConfiguration } from "../lib/push-config";

type Delivery = { id: string; endpoint: string; p256dh: string; auth_key: string; attempts: number };

async function pushWorker() {
  loadEnvConfig(process.cwd(), true);
  const vapidDetails = pushConfiguration();
  const connectionString = process.env.PUSH_DATABASE_URL;
  if (!vapidDetails || !connectionString) throw new Error("Configure PUSH_DATABASE_URL and all VAPID variables.");

  const database = new Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000 });
  const stop = new AbortController();
  process.once("SIGTERM", () => stop.abort());
  process.once("SIGINT", () => stop.abort());
  console.log("Loopr browser push worker is ready.");

  try {
    while (!stop.signal.aborted) {
      try {
        await database.query("DELETE FROM loopr.push_deliveries WHERE expires_at <= now() OR (attempts >= 5 AND available_at <= now())");
        const { rows } = await database.query<Delivery>(
          `WITH ready AS (
             SELECT id FROM loopr.push_deliveries
             WHERE available_at <= now() AND expires_at > now() AND attempts < 5
             ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 10
           ), claimed AS (
             UPDATE loopr.push_deliveries AS job
             SET attempts = attempts + 1, available_at = now() + interval '2 minutes'
             FROM ready WHERE job.id = ready.id RETURNING job.id, job.endpoint, job.attempts
           )
           SELECT claimed.*, sub.p256dh, sub.auth_key
           FROM claimed JOIN loopr.push_subscriptions AS sub USING (endpoint)`,
        );
        await Promise.all(rows.map(async (job) => {
          try {
            if (endpointSchema.safeParse(job.endpoint).success) {
              await sendNotification({ endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth_key } },
                JSON.stringify({ title: "Loopr", body: "You have a new notification." }),
                { TTL: 600, vapidDetails, timeout: 8000 });
            }
            await database.query("DELETE FROM loopr.push_deliveries WHERE id=$1 AND attempts=$2", [job.id, job.attempts]);
          } catch (error) {
            if (error instanceof WebPushError && [404, 410].includes(error.statusCode)) {
              await database.query("DELETE FROM loopr.push_subscriptions WHERE endpoint=$1", [job.endpoint]);
              return;
            }
            await database.query(
              `UPDATE loopr.push_deliveries SET available_at = now() + $3 * interval '1 second'
               WHERE id=$1 AND attempts=$2`,
              [job.id, job.attempts, Math.min(900, 30 * (2 ** job.attempts))],
            );
          }
        }));
      } catch {
        console.warn("Browser push could not process the queue. Retrying.");
      }

      await setTimeout(5000, undefined, { signal: stop.signal }).catch(() => {});
    }
  } finally {
    await database.end();
  }
}

void pushWorker().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Push worker could not start.");
  process.exitCode = 1;
});
