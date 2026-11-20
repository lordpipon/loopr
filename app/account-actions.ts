"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import type { PoolClient } from "pg";
import { getProfile, requireMember, requireSession } from "@/lib/account";
import { asMember } from "@/lib/database";
import { birthday, birthValue, email, password, profileFields, username } from "@/lib/form-data";

export type FormResult = { error?: string; success?: string };

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? error.code : undefined;
}

async function processPhoto(form: FormData) {
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size) return null;
  if (file.size > 4_194_304 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image up to 4 MB.");
  }
  try {
    return await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000 })
      .rotate().resize(384, 384, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new Error("This image could not be opened.");
  }
}

async function savePhoto(client: PoolClient, id: string, photo: Buffer) {
  await client.query("DELETE FROM loopr.avatars WHERE profile_id = $1", [id]);
  const { rows: [avatar] } = await client.query<{ id: string }>(
    "INSERT INTO loopr.avatars (profile_id, bytes) VALUES ($1, $2) RETURNING id", [id, photo],
  );
  await client.query("UPDATE loopr.profiles SET avatar_url = $1 WHERE id = $2", [`/api/avatar/${avatar.id}`, id]);
}

export async function finishOnboarding(_previous: FormResult, form: FormData): Promise<FormResult> {
  const { auth, session, requestHeaders } = await requireSession();
  const id = session.user.id;
  if (await getProfile(id)) redirect("/home");
  const fields = profileFields.extend({ username, birthday }).safeParse({
    ...Object.fromEntries(form), birthday: birthValue(form), pronouns: "", location: "", website: "",
  });
  if (!fields.success) return { error: fields.error.issues[0].message };
  const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
  if (!accounts.some((account) => account.providerId === "credential")) {
    const required = password.safeParse(form.get("password"));
    if (!required.success) return { error: required.error.issues[0].message };
    if (required.data !== form.get("confirmPassword")) return { error: "Passwords do not match." };
    try {
      await auth.api.setPassword({ headers: requestHeaders, body: { newPassword: required.data } });
    } catch {
      return { error: "Could not set your password. Try signing in again." };
    }
  }
  const { displayName, bio, username: handle, birthday: date } = fields.data;
  let photo: Buffer | null;
  try { photo = await processPhoto(form); } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read the photo." };
  }
  const following = z.array(z.guid()).max(3).safeParse(form.getAll("follow"));
  if (!following.success) return { error: "Choose up to three suggested accounts." };
  try {
    await asMember(id, async (client) => {
      const result = await client.query(
        "INSERT INTO loopr.profiles (id, username, display_name, bio) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING",
        [id, handle, displayName, bio],
      );
      if (!result.rowCount) return;
      await client.query("INSERT INTO loopr.profile_details (profile_id, birth_date) VALUES ($1,$2)", [id, date]);
      if (photo) await savePhoto(client, id, photo);
      if (following.data.length) await client.query(
        `INSERT INTO loopr.follows (follower_id, followed_id)
         SELECT $1, id FROM loopr.profiles WHERE id = ANY($2::uuid[]) AND id <> $1
         ON CONFLICT DO NOTHING`, [id, following.data],
      );
    });
  } catch (error) {
    return { error: errorCode(error) === "23505" ? "That username is already taken." : "Could not save your profile. Try again." };
  }
  redirect("/home");
}

export async function saveProfile(_previous: FormResult, form: FormData): Promise<FormResult> {
  const { profile } = await requireMember();
  const parsed = profileFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { displayName, bio, pronouns, location, website } = parsed.data;
  try {
    const photo = await processPhoto(form);
    await asMember(profile.id, async (client) => {
      await client.query(
        "UPDATE loopr.profiles SET display_name=$1, bio=$2, pronouns=$3, location=$4, website=$5 WHERE id=$6",
        [displayName, bio, pronouns, location || null, website || null, profile.id],
      );
      if (photo) await savePhoto(client, profile.id, photo);
      else if (form.get("removePhoto") === "on") {
        await client.query("DELETE FROM loopr.avatars WHERE profile_id = $1", [profile.id]);
        await client.query("UPDATE loopr.profiles SET avatar_url = NULL WHERE id = $1", [profile.id]);
      }
    });
  } catch {
    return { error: "Could not save your profile. Check the photo type and size and try again." };
  }
  revalidatePath("/home");
  revalidatePath("/settings/profile");
  return { success: "Profile saved." };
}

export async function changeUsername(_previous: FormResult, form: FormData): Promise<FormResult> {
  const { profile } = await requireMember();
  const parsed = username.safeParse(form.get("username"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await asMember(profile.id, (client) => client.query(
      "UPDATE loopr.profiles SET username = $1 WHERE id = $2", [parsed.data, profile.id],
    ));
    revalidatePath("/home");
    revalidatePath("/settings/account");
    return { success: "Username saved." };
  } catch (error) {
    switch (errorCode(error)) {
      case "23505": return { error: "That username is already taken." };
      case "P0001": return { error: "Your username can be changed once every 7 days." };
      default: return { error: "Could not save your username. Try again." };
    }
  }
}

async function allowSecurityAttempt(id: string) {
  const { rowCount } = await asMember(id, (client) => client.query(
    `INSERT INTO loopr.security_attempts AS attempt (profile_id)
     VALUES ($1) ON CONFLICT (profile_id) DO UPDATE
     SET attempts = CASE WHEN attempt.window_start <= now() - interval '15 minutes' THEN 1 ELSE attempt.attempts + 1 END,
         window_start = CASE WHEN attempt.window_start <= now() - interval '15 minutes' THEN now() ELSE attempt.window_start END
     WHERE attempt.attempts < 5 OR attempt.window_start <= now() - interval '15 minutes'
     RETURNING profile_id`, [id],
  ));
  return Boolean(rowCount);
}

export async function changePassword(_previous: FormResult, form: FormData): Promise<FormResult> {
  const { auth, requestHeaders, profile } = await requireMember();
  const parsed = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter your current password and a new password of at least 12 characters." };
  if (parsed.data.newPassword !== form.get("confirmPassword")) return { error: "Passwords do not match." };
  if (!await allowSecurityAttempt(profile.id)) return { error: "Too many attempts. Try again in 15 minutes." };
  try {
    await auth.api.changePassword({ headers: requestHeaders, body: { ...parsed.data, revokeOtherSessions: true } });
  } catch {
    return { error: "Password could not be changed. Check your current password." };
  }
  redirect("/settings/account?passwordChanged=1");
}

export async function changeEmail(_previous: FormResult, form: FormData): Promise<FormResult> {
  const { auth, requestHeaders, profile } = await requireMember();
  const parsed = z.object({ email, currentPassword: z.string().min(1).max(128) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter a valid email address and your current password." };
  if (!await allowSecurityAttempt(profile.id)) return { error: "Too many attempts. Try again in 15 minutes." };
  try {
    await auth.api.verifyPassword({ headers: requestHeaders, body: { password: parsed.data.currentPassword } });
    await auth.api.changeEmail({ headers: requestHeaders, body: { newEmail: parsed.data.email, callbackURL: "/settings/account" } });
    return { success: "If the address is available, check your current inbox to approve the change." };
  } catch {
    return { error: "Email change could not be started. Check your password and email address." };
  }
}

export async function unlinkGoogle(_previous: FormResult, form: FormData): Promise<FormResult> {
  const { auth, requestHeaders, profile } = await requireMember();
  const current = z.string().min(1).max(128).safeParse(form.get("currentPassword"));
  if (!current.success) return { error: "Enter your current password." };
  if (!await allowSecurityAttempt(profile.id)) return { error: "Too many attempts. Try again in 15 minutes." };
  try {
    await auth.api.verifyPassword({ headers: requestHeaders, body: { password: current.data } });
    const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
    const google = accounts.find((account) => account.providerId === "google");
    if (google) await auth.api.unlinkAccount({ headers: requestHeaders, body: { accountId: google.id } });
    revalidatePath("/settings/account");
    return { success: "Google account disconnected." };
  } catch {
    return { error: "Could not disconnect Google. Check your current password." };
  }
}
