import { loadEnvConfig } from "@next/env";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../lib/auth-config";
import { database } from "../lib/database";

async function migrate() {
  loadEnvConfig(process.cwd(), true);
  try {
    const migration = await getMigrations(getAuth().options);
    // Supabase may grant access to new public tables through its Data API roles.
    // Apply the migration and revoke those grants in the same transaction.
    const sql = await migration.compileMigrations();
    const client = await database().connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`
        REVOKE ALL ON public."user", public."session", public.account,
          public.verification, public."rateLimit" FROM PUBLIC;
        DO $$
        DECLARE api_role text;
        BEGIN
          FOR api_role IN SELECT rolname FROM pg_roles
            WHERE rolname IN ('anon', 'authenticated', 'service_role')
          LOOP
            EXECUTE format('REVOKE ALL ON public."user", public."session", public.account,
              public.verification, public."rateLimit" FROM %I', api_role);
          END LOOP;
        END $$;
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    console.log("Loopr authentication schema is up to date.");
  } finally {
    await database().end();
  }
}

void migrate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Authentication migration failed.");
  process.exitCode = 1;
});
