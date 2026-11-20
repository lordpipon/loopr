import { Shell } from "@/components/shell";
import { requireMember } from "@/lib/account";
import { getFeed, memberCard } from "@/lib/feed";

export default async function MemberHome() {
  const { profile } = await requireMember();
  return <Shell feed={await getFeed(profile.id)} profileSummary={{
    bio: profile.bio, pronouns: profile.pronouns, location: profile.location, website: profile.website,
  }} viewer={memberCard(profile)} />;
}
