import { Shell } from "@/components/shell";
import { requireMember } from "@/lib/account";

export default async function MemberHome() {
  const { profile } = await requireMember();
  return <Shell authenticated profileSummary={{
    bio: profile.bio, pronouns: profile.pronouns, location: profile.location, website: profile.website,
  }} viewer={{
    name: profile.display_name,
    handle: profile.username,
    initials: profile.display_name.split(/\s+/).slice(0, 2).map((word) => [...word][0]).join("").toUpperCase(),
    color: "#48617e", avatar: profile.avatar_url ?? undefined, verified: profile.is_verified,
  }} />;
}
