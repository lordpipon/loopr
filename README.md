# Loopr

Loopr is a microblogging app backed by PostgreSQL. The signed-out landing page is always available. Account creation and the member feed require database configuration. The same sidebar navigation is available on desktop, tablet, and in the mobile drawer.

## Connect Supabase

Use a dedicated Supabase project for Loopr and keep its database credentials in local or Vercel environment variables.

1. Run `npm ci`. Apply `db/schema.sql`, `db/phase2.sql`, and `db/push-delivery.sql` in order as the migration owner. For an existing Loopr database, apply only the migrations it is missing. These scripts work from the Supabase SQL Editor or `psql`. Keep fixture data in development databases.
2. Set a migration-owner `DATABASE_URL` locally. Use the Supabase session pooler when a direct connection is unavailable. Set `BETTER_AUTH_SECRET` to a value generated with `openssl rand -base64 48` and set `BETTER_AUTH_URL` to the deployment origin. Run `npm run db:migrate-auth` to create Better Auth’s tables and restrict their Data API grants.
3. Create a separate runtime database login and grant access as shown below. Set its password privately. In Vercel, use its TLS connection URL as the secret `DATABASE_URL`. For the Supabase session pooler, use the username `loopr_server.<project-ref>` and the host from **Connect → Session pooler**. Scope this connection and `BETTER_AUTH_SECRET` to the intended Vercel environment.

```sql
CREATE ROLE loopr_server LOGIN;
GRANT loopr_app TO loopr_server;
GRANT USAGE ON SCHEMA public TO loopr_server;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public."user", public."session", public.account, public.verification, public."rateLimit"
  TO loopr_server;
```

4. Set `SMTP_URL` and `SMTP_FROM` for email registration, verification, recovery, and email changes. Enable Google sign-in with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and register `https://your-domain/api/auth/callback/google` in Google Cloud Console. The [environment template](.env.example) lists these settings.
5. Run `npm run dev` locally or redeploy on Vercel. Sign up, verify your email, create a post, and reload to confirm that it persists.

Browser push needs VAPID credentials and the supervised `npm run push:worker` process. Grant `loopr_push_worker` to a separate database login and set its connection URL as `PUSH_DATABASE_URL`.

## Updated phase scope

- **Phase 2 · Accounts.** Google onboarding requires a password. Account settings support Google linking and unlinking, password changes, email changes with confirmation, and a server-enforced seven-day username cooldown.
- **Phase 4 · Profiles.** Build public member profiles and follow pages on the Phase 2 profile editor. Display names have no change cooldown.
- **Phase 5 · Messages and activity.** Add encrypted direct messages. A sender must follow the recipient to start a conversation. Separate regular conversations with people the inbox owner follows from requests sent by people they do not follow. Add daily and weekly quests for likes, follows, and messages, a daily streak, and persistent XP earned and spent through a server-side balance and inventory.
- **Phase 6 · Premium and badges.** Add Premium profile and name effects, animated avatars, super emoji reactions, and a yellow profile badge. Keep the XP shop catalog separate from Premium. Add Admin, Owner, Supporter, Early, Daily Streak, and Halloween 2027 badges. Award Supporter on confirmed real-money transactions. Make the automatic Halloween 2027 award a one-time event during October 2027.
- **Phase 7 · Administration and moderation.** Show the administration panel for database-backed Admin and Owner roles. Enforce privileges on the server and record XP, verification, Premium, badge, account recovery, and timed or permanent ban actions in an audit log. Account recovery uses an expiring reset flow so the operator does not choose the member’s password. Screen uploaded content with an NSFW classifier and support blurring and deletion through moderation.
