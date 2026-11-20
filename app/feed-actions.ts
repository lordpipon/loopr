"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/account";
import { asMember } from "@/lib/database";

export async function publishPost(body: unknown, replyTo: unknown) {
  const { profile } = await requireMember();
  const input = z.object({
    body: z.string().trim().min(1).refine((value) => Array.from(value).length <= (profile.is_verified ? 1000 : 280)), replyTo: z.guid().nullable(),
  }).safeParse({ body, replyTo });
  if (!input.success) return { error: "Check your post length and try again." };
  try {
    await asMember(profile.id, (client) => client.query(
      "INSERT INTO loopr.posts (author_id,body,reply_to) VALUES ($1,$2,$3)", [profile.id, input.data.body, input.data.replyTo],
    ));
    revalidatePath("/home");
    return {};
  } catch {
    return { error: "Could not publish your post." };
  }
}

export async function setActivity(kind: unknown, id: unknown, active: unknown) {
  const input = z.object({ kind: z.enum(["like", "bookmark", "repost", "follow"]), id: z.guid(), active: z.boolean() })
    .safeParse({ kind, id, active });
  if (!input.success) return { error: "Invalid action." };
  const { profile } = await requireMember();
  const action = input.data;
  const statements = {
    like: [
      "DELETE FROM loopr.likes WHERE profile_id=$1 AND post_id=$2",
      "INSERT INTO loopr.likes (profile_id,post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    ],
    bookmark: [
      "DELETE FROM loopr.bookmarks WHERE profile_id=$1 AND post_id=$2",
      "INSERT INTO loopr.bookmarks (profile_id,post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    ],
    repost: [
      "DELETE FROM loopr.posts WHERE author_id=$1 AND repost_of=$2",
      "INSERT INTO loopr.posts (author_id,repost_of) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    ],
    follow: [
      "DELETE FROM loopr.follows WHERE follower_id=$1 AND followed_id=$2",
      "INSERT INTO loopr.follows (follower_id,followed_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    ],
  };
  try {
    await asMember(profile.id, (client) => client.query(statements[action.kind][Number(action.active)], [profile.id, action.id]));
    revalidatePath("/home");
    return {};
  } catch {
    return { error: "Could not save that change." };
  }
}
