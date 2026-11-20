import "server-only";
import { asMember } from "./database";

type ProfileRow = {
  id: string; display_name: string; username: string; avatar_url: string | null; is_verified: boolean;
};

export function memberCard(profile: ProfileRow) {
  return {
    id: profile.id, name: profile.display_name, handle: profile.username, color: "#48617e",
    initials: profile.display_name.split(/\s+/).slice(0, 2).map((word) => [...word][0]).join("").toUpperCase(),
    avatar: profile.avatar_url?.startsWith("/api/avatar/") ? profile.avatar_url : undefined,
    verified: profile.is_verified,
  };
}

export type Person = ReturnType<typeof memberCard>;
export type FeedPost = {
  id: string; person: Person; time: string; text: string; replyHandle: string | null;
  replies: number; reposts: number; likes: number; views: string;
  liked: boolean; reposted: boolean; bookmarked: boolean;
};

type PostRow = Omit<ProfileRow, "id"> & {
  author_id: string; id: string; body: string; created_at: Date;
  reply_count: number; repost_count: number; like_count: number; view_count: string;
  followed: boolean; reply_handle: string | null;
  liked: boolean; reposted: boolean; bookmarked: boolean;
};

export async function getFeed(viewer: string) {
  return asMember(viewer, async (client) => {
    const posts = await client.query<PostRow>(
      `WITH visible AS (
        SELECT p.*,
          (p.author_id = $1 OR EXISTS (SELECT FROM loopr.follows f WHERE f.follower_id=$1 AND f.followed_id=p.author_id AND f.accepted)) AS followed,
          EXISTS (SELECT FROM loopr.bookmarks b WHERE b.profile_id=$1 AND b.post_id=p.id) AS bookmarked
        FROM loopr.posts p
        WHERE p.repost_of IS NULL
          AND NOT EXISTS (SELECT FROM loopr.mutes m WHERE m.owner_id=$1 AND m.target_id=p.author_id)
      ), pages AS (
        (SELECT * FROM visible ORDER BY created_at DESC, id DESC LIMIT 50)
        UNION (SELECT * FROM visible WHERE followed ORDER BY created_at DESC, id DESC LIMIT 50)
        UNION (SELECT * FROM visible WHERE bookmarked ORDER BY created_at DESC, id DESC LIMIT 50)
      )
      SELECT p.*, a.display_name, a.username, a.avatar_url, a.is_verified, parent_author.username AS reply_handle,
        EXISTS (SELECT FROM loopr.likes l WHERE l.profile_id=$1 AND l.post_id=p.id) AS liked,
        EXISTS (SELECT FROM loopr.reposts r WHERE r.profile_id=$1 AND r.post_id=p.id) AS reposted
      FROM pages p JOIN loopr.profiles a ON a.id=p.author_id
      LEFT JOIN loopr.posts parent ON parent.id=p.reply_to
      LEFT JOIN loopr.profiles parent_author ON parent_author.id=parent.author_id
      ORDER BY p.created_at DESC, p.id DESC`, [viewer],
    );
    const members = await client.query<ProfileRow & { follows: boolean }>(
      `SELECT p.id,p.display_name,p.username,p.avatar_url,p.is_verified,
         EXISTS (SELECT FROM loopr.follows f WHERE f.follower_id=$1 AND f.followed_id=p.id) AS follows
       FROM loopr.profiles p WHERE p.id<>$1 AND NOT p.is_protected
         AND loopr.can_see_author(p.id)
       ORDER BY p.created_at DESC, p.id DESC LIMIT 12`, [viewer],
    );
    const counts = await client.query<{ following: number; followers: number; unread: number }>(
      `SELECT
        (SELECT count(*)::int FROM loopr.follows WHERE follower_id=$1 AND accepted) AS following,
        (SELECT count(*)::int FROM loopr.follows WHERE followed_id=$1 AND accepted) AS followers,
        (SELECT count(*)::int FROM loopr.notifications WHERE recipient_id=$1 AND read_at IS NULL) AS unread`, [viewer],
    );
    const convert = (row: PostRow): FeedPost => ({
      id: row.id, person: memberCard({ ...row, id: row.author_id }), text: row.body, replyHandle: row.reply_handle,
      time: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(row.created_at),
      replies: row.reply_count, reposts: row.repost_count, likes: row.like_count, views: row.view_count,
      liked: row.liked, reposted: row.reposted, bookmarked: row.bookmarked,
    });
    return {
      latest: posts.rows.slice(0, 50).map(convert),
      following: posts.rows.filter((row) => row.followed).slice(0, 50).map(convert),
      bookmarks: posts.rows.filter((row) => row.bookmarked).slice(0, 50).map(convert),
      people: members.rows.map((row) => ({ ...memberCard(row), follows: row.follows })),
      counts: counts.rows[0],
    };
  });
}
export type Feed = Awaited<ReturnType<typeof getFeed>>;
