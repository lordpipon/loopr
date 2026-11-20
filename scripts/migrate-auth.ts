import { loadEnvConfig } from "@next/env";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../lib/auth-config";
import { database } from "../lib/database";

async function migrate() {
  loadEnvConfig(process.cwd(), true);
  try {
    const migration = await getMigrations(getAuth().options);
    await migration.runMigrations();
    console.log("Loopr authentication schema is up to date.");
  } finally {
    await database().end();
  }
}

void migrate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Authentication migration failed.");
  process.exitCode = 1;
});
