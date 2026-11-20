export const people = {
  jordan: { name: "Jordan Lee", handle: "jordan", color: "#584c83", initials: "JL" },
  maya: { name: "Maya Chen", handle: "mayachen", color: "#406859", initials: "MC", verified: true },
  noah: { name: "Noah Williams", handle: "noahw", color: "#8e5947", initials: "NW" },
  amina: { name: "Amina Patel", handle: "aminamakes", color: "#59527e", initials: "AP", verified: true },
  leo: { name: "Leo Park", handle: "leopark", color: "#3f627c", initials: "LP" },
  sofia: { name: "Sofia Rivera", handle: "sofiar", color: "#8c536e", initials: "SR" },
};

export type Person = { name: string; handle: string; initials: string; color: string; verified?: boolean; avatar?: string };
export type SamplePost = {
  id: number; person: Person; time: string; text: string; image?: string; alt?: string;
  replies: number; reposts: number; likes: number; views: string;
};

export const posts: SamplePost[] = [
  { id: 1, person: people.maya, time: "2h", text: "Spent the weekend sketching spaces that feel like a deep breath.\n\nSomewhere between a cabin, a studio, and a reason to go offline.", image: "/images/field-notes.webp", alt: "A low concrete pavilion surrounded by a quiet, misty forest", replies: 12, reposts: 24, likes: 186, views: "4.2K" },
  { id: 2, person: people.noah, time: "4h", text: "What’s one small thing you do that makes your workday noticeably better? Mine is a walk before opening my inbox.", replies: 36, reposts: 8, likes: 94, views: "1.8K" },
  { id: 3, person: people.amina, time: "6h", text: "A reminder to save the work you nearly threw away. The sketches that never turn into anything have a way of showing up again when you need them.", replies: 7, reposts: 14, likes: 82, views: "986" },
];

export const trends = [
  { category: "Design", name: "Design systems", count: "12.4K" },
  { category: "Technology", name: "The indie web", count: "8,291" },
  { category: "Culture", name: "#SlowLiving", count: "5,620" },
  { category: "Photography", name: "Film photography", count: "2,514" },
];
