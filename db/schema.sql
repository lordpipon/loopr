BEGIN;

CREATE SCHEMA loopr;
SET LOCAL search_path = loopr, pg_catalog;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'loopr_app') THEN
    CREATE ROLE loopr_app NOLOGIN;
  END IF;
END $$;

-- The trusted server sets this value from its authenticated session inside each transaction.
CREATE FUNCTION viewer_id() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('loopr.viewer_id', true), '')::uuid $$;

CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 160),
  location text, website text, avatar_url text, banner_url text,
  is_verified boolean NOT NULL DEFAULT false,
  is_protected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profile_details (
  profile_id uuid PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
  birth_date date
);

CREATE TABLE follows (
  follower_id uuid REFERENCES profiles ON DELETE CASCADE,
  followed_id uuid REFERENCES profiles ON DELETE CASCADE,
  accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
CREATE INDEX follows_followed_idx ON follows (followed_id, follower_id);

CREATE TABLE blocks (
  owner_id uuid REFERENCES profiles ON DELETE CASCADE,
  target_id uuid REFERENCES profiles ON DELETE CASCADE,
  PRIMARY KEY (owner_id, target_id),
  CHECK (owner_id <> target_id)
);

CREATE TABLE mutes (
  owner_id uuid REFERENCES profiles ON DELETE CASCADE,
  target_id uuid REFERENCES profiles ON DELETE CASCADE,
  PRIMARY KEY (owner_id, target_id),
  CHECK (owner_id <> target_id)
);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 1000),
  reply_to uuid REFERENCES posts ON DELETE CASCADE,
  quote_of uuid REFERENCES posts ON DELETE SET NULL,
  repost_of uuid REFERENCES posts ON DELETE CASCADE,
  media jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(media) = 'array' AND jsonb_array_length(media) <= 4),
  reply_count integer NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  repost_count integer NOT NULL DEFAULT 0 CHECK (repost_count >= 0),
  bookmark_count integer NOT NULL DEFAULT 0 CHECK (bookmark_count >= 0),
  quote_count integer NOT NULL DEFAULT 0 CHECK (quote_count >= 0),
  view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(reply_to, quote_of, repost_of) <= 1),
  CHECK (id IS DISTINCT FROM reply_to AND id IS DISTINCT FROM quote_of AND id IS DISTINCT FROM repost_of)
);
CREATE INDEX posts_author_time_idx ON posts (author_id, created_at DESC, id);
CREATE INDEX posts_time_idx ON posts (created_at DESC, id);
CREATE INDEX posts_reply_idx ON posts (reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX posts_quote_idx ON posts (quote_of) WHERE quote_of IS NOT NULL;
CREATE UNIQUE INDEX posts_one_repost_idx ON posts (author_id, repost_of) WHERE repost_of IS NOT NULL;
CREATE INDEX posts_repost_idx ON posts (repost_of) WHERE repost_of IS NOT NULL;

CREATE TABLE likes (
  profile_id uuid REFERENCES profiles ON DELETE CASCADE,
  post_id uuid REFERENCES posts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, post_id)
);
CREATE INDEX likes_post_idx ON likes (post_id);

-- Reposts use posts.repost_of as their single source of truth.
CREATE VIEW reposts WITH (security_invoker = true) AS
SELECT author_id AS profile_id, repost_of AS post_id, id AS repost_id, created_at
FROM posts WHERE repost_of IS NOT NULL;

CREATE TABLE bookmarks (
  profile_id uuid REFERENCES profiles ON DELETE CASCADE,
  post_id uuid REFERENCES posts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, post_id)
);
CREATE INDEX bookmarks_post_idx ON bookmarks (post_id);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('like', 'follow', 'reply', 'repost', 'quote', 'mention')),
  post_id uuid REFERENCES posts ON DELETE CASCADE,
  read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (recipient_id, actor_id, kind, post_id)
);
CREATE INDEX notifications_recipient_idx ON notifications (recipient_id, created_at DESC);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE conversation_members (
  conversation_id uuid REFERENCES conversations ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles ON DELETE CASCADE,
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, profile_id)
);
CREATE INDEX conversation_members_profile_idx ON conversation_members (profile_id);
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 10000),
  media jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(media) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at DESC);

CREATE TABLE hashtags (
  tag text PRIMARY KEY CHECK (tag = lower(tag) AND char_length(tag) BETWEEN 1 AND 100)
);
CREATE TABLE post_hashtags (
  post_id uuid REFERENCES posts ON DELETE CASCADE,
  tag text REFERENCES hashtags ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag)
);
CREATE INDEX post_hashtags_tag_idx ON post_hashtags (tag);

CREATE TABLE verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE verification_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES verification_requests ON DELETE CASCADE,
  checkout_session_id text NOT NULL UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents = 100),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  paid_at timestamptz
);

CREATE FUNCTION can_see_author(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
  SELECT target = viewer_id() OR EXISTS (
    SELECT FROM profiles p WHERE p.id = target
      AND (NOT p.is_protected OR EXISTS (
        SELECT FROM follows f WHERE f.followed_id = target AND f.follower_id = viewer_id() AND f.accepted
      ))
      AND NOT EXISTS (
        SELECT FROM blocks b WHERE (b.owner_id, b.target_id) IN ((viewer_id(), target), (target, viewer_id()))
      )
  )
$$;

CREATE FUNCTION can_see_post(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
  WITH RECURSIVE ancestors AS (
    SELECT p.id, p.author_id, coalesce(p.reply_to, p.quote_of, p.repost_of) AS parent
    FROM posts p WHERE p.id = target
    UNION
    SELECT p.id, p.author_id, coalesce(p.reply_to, p.quote_of, p.repost_of)
    FROM posts p JOIN ancestors a ON p.id = a.parent
  )
  SELECT coalesce(bool_and(can_see_author(author_id)), false) FROM ancestors
$$;

CREATE FUNCTION is_conversation_member(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
  SELECT EXISTS (SELECT FROM conversation_members WHERE conversation_id = target AND profile_id = viewer_id())
$$;

CREATE FUNCTION can_send_message(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
  SELECT is_conversation_member(target) AND NOT EXISTS (
    SELECT FROM conversation_members m JOIN blocks b
      ON (b.owner_id, b.target_id) IN ((viewer_id(), m.profile_id), (m.profile_id, viewer_id()))
    WHERE m.conversation_id = target
  )
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (id = viewer_id());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = viewer_id()) WITH CHECK (id = viewer_id());

ALTER TABLE profile_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_details_own ON profile_details USING (profile_id = viewer_id()) WITH CHECK (profile_id = viewer_id());

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_read ON posts FOR SELECT USING (can_see_post(id));
CREATE POLICY posts_insert ON posts FOR INSERT WITH CHECK (author_id = viewer_id()
  AND (reply_to IS NULL OR can_see_post(reply_to)) AND (quote_of IS NULL OR can_see_post(quote_of))
  AND (repost_of IS NULL OR can_see_post(repost_of)));
CREATE POLICY posts_delete ON posts FOR DELETE USING (author_id = viewer_id());

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY follows_read ON follows FOR SELECT USING (
  viewer_id() IN (follower_id, followed_id) OR (accepted AND can_see_author(followed_id) AND can_see_author(follower_id))
);
CREATE POLICY follows_add ON follows FOR INSERT WITH CHECK (follower_id = viewer_id());
CREATE POLICY follows_approve ON follows FOR UPDATE USING (followed_id = viewer_id()) WITH CHECK (followed_id = viewer_id());
CREATE POLICY follows_delete ON follows FOR DELETE USING (viewer_id() IN (follower_id, followed_id));

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY likes_read ON likes FOR SELECT USING (can_see_post(post_id) AND can_see_author(profile_id));
CREATE POLICY likes_add ON likes FOR INSERT WITH CHECK (profile_id = viewer_id() AND can_see_post(post_id));
CREATE POLICY likes_remove ON likes FOR DELETE USING (profile_id = viewer_id());

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookmarks_read ON bookmarks FOR SELECT USING (profile_id = viewer_id() AND can_see_post(post_id));
CREATE POLICY bookmarks_add ON bookmarks FOR INSERT WITH CHECK (profile_id = viewer_id() AND can_see_post(post_id));
CREATE POLICY bookmarks_remove ON bookmarks FOR DELETE USING (profile_id = viewer_id());

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocks_own ON blocks USING (owner_id = viewer_id()) WITH CHECK (owner_id = viewer_id());
ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY mutes_own ON mutes USING (owner_id = viewer_id()) WITH CHECK (owner_id = viewer_id());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_read ON notifications FOR SELECT USING (
  recipient_id = viewer_id() AND (post_id IS NULL OR can_see_post(post_id))
);
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (recipient_id = viewer_id()) WITH CHECK (recipient_id = viewer_id());

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversations_read ON conversations FOR SELECT USING (is_conversation_member(id));
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_members_read ON conversation_members FOR SELECT USING (is_conversation_member(conversation_id));
CREATE POLICY conversation_members_update ON conversation_members FOR UPDATE USING (profile_id = viewer_id()) WITH CHECK (profile_id = viewer_id());
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_read ON messages FOR SELECT USING (is_conversation_member(conversation_id));
CREATE POLICY messages_add ON messages FOR INSERT WITH CHECK (sender_id = viewer_id() AND can_send_message(conversation_id));

ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY hashtags_read ON hashtags FOR SELECT USING (EXISTS (SELECT FROM post_hashtags ph WHERE ph.tag = hashtags.tag));
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_hashtags_read ON post_hashtags FOR SELECT USING (can_see_post(post_id));

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY verification_requests_read ON verification_requests FOR SELECT USING (profile_id = viewer_id());
ALTER TABLE verification_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY verification_payments_read ON verification_payments FOR SELECT USING (
  EXISTS (SELECT FROM verification_requests r WHERE r.id = request_id AND r.profile_id = viewer_id())
);

CREATE FUNCTION validate_post() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
BEGIN
  IF char_length(NEW.body) > 280 AND NOT EXISTS (
    SELECT FROM profiles WHERE id = NEW.author_id AND is_verified
  ) THEN
    RAISE EXCEPTION 'Post exceeds 280 characters';
  END IF;
  IF NEW.body ~ '^[[:space:]]*$' AND jsonb_array_length(NEW.media) = 0
    AND NEW.repost_of IS NULL AND NEW.quote_of IS NULL THEN
    RAISE EXCEPTION 'Post requires text or media';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER validate_post_before_insert BEFORE INSERT ON posts FOR EACH ROW EXECUTE FUNCTION validate_post();

CREATE FUNCTION prepare_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
BEGIN
  IF EXISTS (SELECT FROM blocks WHERE (owner_id, target_id) IN (
    (NEW.follower_id, NEW.followed_id), (NEW.followed_id, NEW.follower_id)
  )) THEN
    RAISE EXCEPTION 'Follow unavailable';
  END IF;
  NEW.accepted := NOT (SELECT is_protected FROM profiles WHERE id = NEW.followed_id);
  RETURN NEW;
END
$$;
CREATE TRIGGER prepare_follow_before_insert BEFORE INSERT ON follows FOR EACH ROW EXECUTE FUNCTION prepare_follow();

CREATE FUNCTION notify(target uuid, actor uuid, event_kind text, target_post uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
  INSERT INTO notifications (recipient_id, actor_id, kind, post_id)
  SELECT target, actor, event_kind, target_post WHERE target IS NOT NULL AND target <> actor
  ON CONFLICT DO NOTHING
$$;

CREATE FUNCTION update_reaction() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
DECLARE target uuid; actor uuid; delta integer; recipient uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN target := NEW.post_id; actor := NEW.profile_id; delta := 1;
  ELSE target := OLD.post_id; actor := OLD.profile_id; delta := -1;
  END IF;
  IF TG_TABLE_NAME = 'likes' THEN
    UPDATE posts SET like_count = like_count + delta WHERE id = target RETURNING author_id INTO recipient;
    IF delta = 1 THEN PERFORM notify(recipient, actor, 'like', target);
    ELSE DELETE FROM notifications WHERE actor_id = actor AND kind = 'like' AND post_id = target;
    END IF;
  ELSE
    UPDATE posts SET bookmark_count = bookmark_count + delta WHERE id = target;
  END IF;
  RETURN NULL;
END
$$;
CREATE TRIGGER likes_after_change AFTER INSERT OR DELETE ON likes FOR EACH ROW EXECUTE FUNCTION update_reaction();
CREATE TRIGGER bookmarks_after_change AFTER INSERT OR DELETE ON bookmarks FOR EACH ROW EXECUTE FUNCTION update_reaction();

CREATE FUNCTION update_post_context() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
DECLARE item posts; delta integer; recipient uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN item := NEW; delta := 1;
  ELSE item := OLD; delta := -1;
  END IF;
  IF item.reply_to IS NOT NULL THEN
    UPDATE posts SET reply_count = reply_count + delta WHERE id = item.reply_to RETURNING author_id INTO recipient;
    IF delta = 1 THEN PERFORM notify(recipient, item.author_id, 'reply', item.id); END IF;
  ELSIF item.quote_of IS NOT NULL THEN
    UPDATE posts SET quote_count = quote_count + delta WHERE id = item.quote_of RETURNING author_id INTO recipient;
    IF delta = 1 THEN PERFORM notify(recipient, item.author_id, 'quote', item.id); END IF;
  ELSIF item.repost_of IS NOT NULL THEN
    UPDATE posts SET repost_count = repost_count + delta WHERE id = item.repost_of RETURNING author_id INTO recipient;
    IF delta = 1 THEN PERFORM notify(recipient, item.author_id, 'repost', item.id); END IF;
  END IF;
  RETURN NULL;
END
$$;
CREATE TRIGGER posts_after_change AFTER INSERT OR DELETE ON posts FOR EACH ROW EXECUTE FUNCTION update_post_context();

CREATE FUNCTION notify_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, loopr, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM notifications WHERE recipient_id = OLD.followed_id AND actor_id = OLD.follower_id AND kind = 'follow';
  ELSE
    PERFORM notify(NEW.followed_id, NEW.follower_id, 'follow', NULL);
  END IF;
  RETURN NULL;
END
$$;
CREATE TRIGGER follows_after_change AFTER INSERT OR DELETE ON follows FOR EACH ROW EXECUTE FUNCTION notify_follow();

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA loopr FROM PUBLIC;
GRANT USAGE ON SCHEMA loopr TO loopr_app;
GRANT EXECUTE ON FUNCTION viewer_id(), can_see_author(uuid), can_see_post(uuid), is_conversation_member(uuid), can_send_message(uuid) TO loopr_app;
GRANT SELECT ON ALL TABLES IN SCHEMA loopr TO loopr_app;
GRANT INSERT (id, username, display_name, bio, location, website, avatar_url, banner_url, is_protected),
      UPDATE (username, display_name, bio, location, website, avatar_url, banner_url, is_protected) ON profiles TO loopr_app;
GRANT INSERT, UPDATE, DELETE ON profile_details TO loopr_app;
GRANT INSERT (author_id, body, reply_to, quote_of, repost_of, media), DELETE ON posts TO loopr_app;
GRANT INSERT (follower_id, followed_id), UPDATE (accepted), DELETE ON follows TO loopr_app;
GRANT INSERT (profile_id, post_id), DELETE ON likes, bookmarks TO loopr_app;
GRANT INSERT, DELETE ON blocks, mutes TO loopr_app;
GRANT UPDATE (read_at) ON notifications TO loopr_app;
GRANT UPDATE (last_read_at) ON conversation_members TO loopr_app;
GRANT INSERT (conversation_id, sender_id, body, media) ON messages TO loopr_app;
COMMIT;
