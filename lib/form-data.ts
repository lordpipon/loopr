import { z } from "zod";

export const username = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Use 3–30 letters, numbers or underscores.");
export const password = z.string().min(12, "Use at least 12 characters.").max(128);
export const email = z.email().max(254).transform((value) => value.trim().toLowerCase());
export const displayName = z.string().trim().min(1, "Enter a display name.").max(50);
export const birthday = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Date();
  today.setUTCFullYear(today.getUTCFullYear() - 13);
  return date <= today && date.getUTCFullYear() >= 1900;
}, "Enter a valid date of birth. You must be at least 13.");

export const profileFields = z.object({
  displayName,
  bio: z.string().trim().max(160),
  pronouns: z.string().trim().max(40),
  location: z.string().trim().max(100),
  website: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(300)]),
});

export function birthValue(form: FormData) {
  return [form.get("year"), String(form.get("month")).padStart(2, "0"), String(form.get("day")).padStart(2, "0")].join("-");
}
