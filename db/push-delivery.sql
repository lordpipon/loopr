BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'loopr_push_worker') THEN
    CREATE ROLE loopr_push_worker NOLOGIN;
  END IF;
END $$;

CREATE TABLE loopr.push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES loopr.notifications ON DELETE CASCADE,
  endpoint text NOT NULL REFERENCES loopr.push_subscriptions ON DELETE CASCADE,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  UNIQUE (notification_id, endpoint)
);
CREATE INDEX push_deliveries_available_idx ON loopr.push_deliveries (available_at);
CREATE INDEX push_deliveries_endpoint_idx ON loopr.push_deliveries (endpoint);

CREATE FUNCTION loopr.enqueue_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
BEGIN
  INSERT INTO push_deliveries (notification_id, endpoint)
  SELECT NEW.id, endpoint FROM push_subscriptions WHERE profile_id = NEW.recipient_id
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END
$$;
REVOKE EXECUTE ON FUNCTION loopr.enqueue_push() FROM PUBLIC;
CREATE TRIGGER notification_push_after_insert AFTER INSERT ON loopr.notifications
FOR EACH ROW EXECUTE FUNCTION loopr.enqueue_push();

CREATE POLICY push_worker_read ON loopr.push_subscriptions
FOR SELECT TO loopr_push_worker USING (true);
CREATE POLICY push_worker_remove ON loopr.push_subscriptions
FOR DELETE TO loopr_push_worker USING (true);

GRANT USAGE ON SCHEMA loopr TO loopr_push_worker;
GRANT SELECT, UPDATE (attempts, available_at), DELETE ON loopr.push_deliveries TO loopr_push_worker;
GRANT SELECT (endpoint, p256dh, auth_key), DELETE ON loopr.push_subscriptions TO loopr_push_worker;

COMMIT;
