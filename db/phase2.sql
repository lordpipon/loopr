BEGIN;

ALTER TABLE loopr.profiles ADD COLUMN pronouns text NOT NULL DEFAULT '' CHECK (char_length(pronouns) <= 40);
ALTER TABLE loopr.profiles ADD COLUMN username_changed_at timestamptz;

CREATE FUNCTION loopr.enforce_username_cooldown() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, loopr, pg_temp AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF OLD.username_changed_at IS NOT NULL AND OLD.username_changed_at + interval '168 hours' > now() THEN
      RAISE EXCEPTION 'Username can only be changed once every 7 days' USING ERRCODE = 'P0001';
    END IF;
    NEW.username_changed_at := now();
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER username_cooldown BEFORE UPDATE OF username ON loopr.profiles
FOR EACH ROW EXECUTE FUNCTION loopr.enforce_username_cooldown();

CREATE TABLE loopr.avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES loopr.profiles ON DELETE CASCADE,
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 1048576)
);
ALTER TABLE loopr.avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY avatar_public_read ON loopr.avatars FOR SELECT USING (true);
CREATE POLICY avatar_insert ON loopr.avatars FOR INSERT WITH CHECK (profile_id = loopr.viewer_id());
CREATE POLICY avatar_remove ON loopr.avatars FOR DELETE USING (profile_id = loopr.viewer_id());

GRANT INSERT (pronouns), UPDATE (pronouns) ON loopr.profiles TO loopr_app;
GRANT SELECT, INSERT (profile_id, bytes), DELETE ON loopr.avatars TO loopr_app;

CREATE TABLE loopr.security_attempts (
  profile_id uuid PRIMARY KEY REFERENCES loopr.profiles ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 5),
  window_start timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE loopr.security_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_attempts_own ON loopr.security_attempts
USING (profile_id = loopr.viewer_id()) WITH CHECK (profile_id = loopr.viewer_id());
GRANT SELECT, INSERT, UPDATE ON loopr.security_attempts TO loopr_app;

CREATE TABLE loopr.push_subscriptions (
  endpoint text PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES loopr.profiles ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  last_test_at timestamptz
);
CREATE INDEX push_subscriptions_profile_idx ON loopr.push_subscriptions (profile_id);
ALTER TABLE loopr.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_subscriptions_own ON loopr.push_subscriptions
USING (profile_id = loopr.viewer_id()) WITH CHECK (profile_id = loopr.viewer_id());
GRANT SELECT, INSERT, DELETE ON loopr.push_subscriptions TO loopr_app;
GRANT UPDATE (last_test_at) ON loopr.push_subscriptions TO loopr_app;

COMMIT;
