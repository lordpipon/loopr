BEGIN;
SET LOCAL search_path = loopr, pg_catalog;

INSERT INTO profiles (id, username, display_name, bio, location, is_verified, created_at)
SELECT md5('loopr-demo-profile-' || i)::uuid,
       CASE i WHEN 1 THEN 'mayachen' WHEN 2 THEN 'noahw' WHEN 3 THEN 'aminamakes' ELSE 'loopr_demo_' || i END,
       CASE i WHEN 1 THEN 'Maya Chen' WHEN 2 THEN 'Noah Williams' WHEN 3 THEN 'Amina Patel'
         ELSE (ARRAY['Sofia', 'Leo', 'Kira', 'Ravi', 'Hana', 'Alex', 'Sam', 'Jules', 'Indigo'])[1 + (i % 9)]
           || ' ' || (ARRAY['Ng', 'Park', 'Singh', 'Diaz', 'Olsen', 'Shah', 'Reed'])[1 + (i % 7)] END,
       (ARRAY['Collecting ideas and field notes.', 'Usually outside with a camera.', 'Making small things for the web.'])[1 + (i % 3)],
       (ARRAY['Vancouver', 'Chicago', 'Lisbon', 'Seoul', 'Melbourne'])[1 + (i % 5)],
       i % 3 = 1,
       now() - (i + 14) * interval '1 day'
FROM generate_series(1, 30) AS users(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO posts (id, author_id, body, media, view_count, created_at)
SELECT md5('loopr-demo-post-' || i)::uuid, md5('loopr-demo-profile-' || (1 + ((i - 1) % 30)))::uuid,
       (ARRAY['The best ideas in my notebook tend to start as questions.', 'A quiet afternoon to look at the details.', 'What are you making time for this week?', 'Today’s field notes: take the long way home.', 'Sketching out a new project. #FieldNotes'])[1 + ((i - 1) % 5)],
       CASE WHEN i % 7 = 1 THEN jsonb_build_array(jsonb_build_object(
         'url', '/images/field-notes.webp', 'alt', 'A concrete pavilion in a misty forest'
       )) ELSE '[]'::jsonb END,
       (i * 167) % 12400, now() - i * interval '17 minutes'
FROM generate_series(1, 150) AS roots(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO posts (id, author_id, body, reply_to, created_at)
SELECT md5('loopr-demo-post-' || i)::uuid, md5('loopr-demo-profile-' || (1 + (i % 30)))::uuid,
       (ARRAY['I’d like to hear more about this.', 'Saving this idea for later.', 'Thanks for sharing your process.'])[1 + (i % 3)],
       md5('loopr-demo-post-' || (1 + (i % 19)))::uuid, now() - (i - 150) * interval '3 minutes'
FROM generate_series(151, 185) AS replies(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO posts (id, author_id, body, quote_of, created_at)
SELECT md5('loopr-demo-post-' || i)::uuid, md5('loopr-demo-profile-' || (1 + (i % 30)))::uuid,
       'Something worth revisiting this week.',
       md5('loopr-demo-post-' || (1 + (i % 31)))::uuid, now() - (i - 185) * interval '6 minutes'
FROM generate_series(186, 200) AS quotes(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO follows (follower_id, followed_id)
SELECT md5('loopr-demo-profile-' || i)::uuid, md5('loopr-demo-profile-' || j)::uuid
FROM generate_series(1, 30) AS a(i) CROSS JOIN generate_series(1, 30) AS b(j)
WHERE i <> j AND (i * 13 + j * 17) % 7 = 0
ON CONFLICT DO NOTHING;

INSERT INTO likes (profile_id, post_id)
SELECT md5('loopr-demo-profile-' || j)::uuid, md5('loopr-demo-post-' || i)::uuid
FROM generate_series(1, 200) AS a(i) CROSS JOIN generate_series(1, 30) AS b(j)
WHERE (i * 19 + j * 17) % 31 < 2 + i % 22
ON CONFLICT DO NOTHING;

INSERT INTO bookmarks (profile_id, post_id)
SELECT md5('loopr-demo-profile-' || j)::uuid, md5('loopr-demo-post-' || i)::uuid
FROM generate_series(1, 120) AS a(i) CROSS JOIN generate_series(1, 30) AS b(j)
WHERE (i * 13 + j * 17) % 101 < i % 9
ON CONFLICT DO NOTHING;

INSERT INTO hashtags VALUES ('fieldnotes') ON CONFLICT DO NOTHING;
INSERT INTO post_hashtags (post_id, tag)
SELECT id, 'fieldnotes' FROM posts WHERE body LIKE '%#FieldNotes%'
ON CONFLICT DO NOTHING;

COMMIT;
