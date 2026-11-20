# Loopr · Phase 2

Loopr is a microblogging app with a three-column desktop layout, a compact navigation rail at tablet widths, and a mobile drawer with bottom navigation. Phase 1 uses fixture data and runs without service credentials.

## Run the preview

Use Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To check a production build, run `npm run build` followed by `npm start`. Run `npm run typecheck` to check TypeScript.

## What to try

- Resize across 1280, 1000, and 700 pixels. The center column is 600 pixels on desktop.
- Open **Settings → Display** and try Default, Dim, and Lights out. Change the accent and reload to confirm it persists.
- Try the mobile account drawer, bottom tabs, and floating compose button. Escape closes dialogs and returns focus to the opener.
- Search for **Amina** or **Design**. Follow Amina, then open **Home → Following** to see the fixture post.
- Compose, like, or bookmark a sample post. These actions demonstrate the layout and reset when you reload.
- The airplane logo lives at `public/logo.svg` and the browser icon lives at `public/favicon.png`.

## Optional PostgreSQL fixture

The preview has no database connection. To inspect the schema independently, use a fresh PostgreSQL 15+ development database and a migration owner with permission to create schemas and roles.

```sh
psql -v ON_ERROR_STOP=1 -d loopr_dev -f db/schema.sql
psql -v ON_ERROR_STOP=1 -d loopr_dev -f db/seed.sql
```

The seed can be rerun against the same fixture database. It creates 30 fictional profiles and 200 sample posts, including replies, quotes, image attachments, and varied engagement.

The restricted `loopr_app` group role relies on server-managed identity. The future server must use a non-owner login with membership in that role and set `loopr.viewer_id` inside each transaction from a verified session. Database credentials and the identity setting must stay server-side. Conversation membership, payment records, and verified status require privileged server operations.

No environment variables or Supabase, Google, or Stripe dashboard changes are needed for Phase 1. VPS deployment is separate from this preview.

## Settings and XP Shop preview

Display now lives under **Settings → Display**. The fixture preview shows account and profile settings without saving them. **Quests**, **Shop**, and **Premium** have entries in the desktop sidebar and mobile drawer. The Shop gives the demo account 250 XP to try buying and equipping a shop-exclusive effect. The preview resets the balance and purchases on reload.

## Updated phase scope

- **Phase 2 · Accounts.** Google onboarding requires a password. Account settings support Google linking and unlinking, password changes, email changes with confirmation, and a server-enforced seven-day username cooldown.
- **Phase 4 · Profiles.** Build public member profiles and follow pages on the Phase 2 profile editor. Display names have no change cooldown.
- **Phase 5 · Messages and activity.** Add encrypted direct messages. A sender must follow the recipient to start a conversation. Separate regular conversations with people the inbox owner follows from requests sent by people they do not follow. Add daily and weekly quests for likes, follows, and messages, a daily streak, and persistent XP earned and spent through a server-side balance and inventory.
- **Phase 6 · Premium and badges.** Add Premium profile and name effects, animated avatars, super emoji reactions, and a yellow profile badge. Keep the XP shop catalog separate from Premium. Add Admin, Owner, Supporter, Early, Daily Streak, and Halloween 2027 badges. Award Supporter on confirmed real-money transactions. Make the automatic Halloween 2027 award a one-time event during October 2027.
- **Phase 7 · Administration and moderation.** Show the administration panel for database-backed Admin and Owner roles. Enforce privileges on the server and record XP, verification, Premium, badge, account recovery, and timed or permanent ban actions in an audit log. Account recovery uses an expiring reset flow so the operator does not choose the member’s password. Screen uploaded content with an NSFW classifier and support blurring and deletion through moderation.

## Phase 2 · Run accounts on your VPS

With no `DATABASE_URL`, `/` serves the fixture feed and `/welcome` previews the login and registration UI. With PostgreSQL configured, `/` is the signed-out landing page and `/home` requires a verified account and a completed profile. The feed, quests, XP balance, and shop purchases still use preview data.

1. Run `npm ci` and copy `.env.example` to `.env.local`. Set `BETTER_AUTH_URL` to the public HTTPS origin and generate `BETTER_AUTH_SECRET` with `openssl rand -base64 48`. Use `http://localhost:3000` for local testing.
2. On a PostgreSQL 15+ database, apply `db/schema.sql` once as the migration owner if Phase 1 has not been applied, then apply `db/phase2.sql` and `db/push-delivery.sql` once. Optionally apply `db/seed.sql` for fixture follow suggestions. Set a migration-owner `DATABASE_URL` temporarily and run `npm run db:migrate-auth`.
3. Create a separate runtime login and grant the roles and tables below. Set a password using `\password loopr_server` in `psql`, then replace the migration-owner `DATABASE_URL` with the runtime login URL. If the runtime login already exists, apply just the grants.

```sql
CREATE ROLE loopr_server LOGIN;
GRANT loopr_app TO loopr_server;
GRANT USAGE ON SCHEMA public TO loopr_server;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public."user", public."session", public.account, public.verification, public."rateLimit"
  TO loopr_server;
```

4. Set `SMTP_URL` and `SMTP_FROM` for registration verification, account recovery, and email changes. The SMTP server needs a trusted TLS certificate. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable Google. In Google Cloud Console, create an OAuth **Web application** client, add the public origin to authorized JavaScript origins, and register `https://your-domain/api/auth/callback/google` as an authorized redirect URI. Add test users to the consent screen while the client is in testing mode. Use the same origin and callback path for local testing.
5. For browser push, run `npx web-push generate-vapid-keys` and fill `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and a real contact address in `VAPID_SUBJECT`. Use HTTPS in production. Set trusted client-IP headers at the reverse proxy and rate-limit `/api/auth/*` there as well.
6. Run `npm run build` and `npm start`. No Supabase or Stripe configuration is required.

Test email registration through the verification link, username availability, and the profile photo and bio steps. Test that Google onboarding asks for a password, that the same user can sign out and sign in with email and password, and that linking and unlinking Google preserve password access. In **Settings → Account and sign-in**, try a wrong current password, complete a password change, and check that a second username change within seven days is rejected. In **Settings → Push notifications**, enable push and send a test. To deliver database notification events automatically, run `npm run push:worker` as a supervised background process with the same VAPID values. Create a separate PostgreSQL login for it and grant `loopr_push_worker` to that login. Set its connection URL in `PUSH_DATABASE_URL`. The worker queues only new notifications for active subscriptions. It sends a generic lock-screen alert without message or post content. The fixture feed does not create persistent social events.
