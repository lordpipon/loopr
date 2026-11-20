import { z } from "zod";
import { authEnabled } from "@/lib/auth-config";
import { database } from "@/lib/database";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await context.params).id);
  if (!authEnabled() || !id.success) return new Response(null, { status: 404 });
  const { rows: [avatar] } = await database().query<{ bytes: Buffer }>("SELECT bytes FROM loopr.avatars WHERE id = $1", [id.data]);
  if (!avatar) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(avatar.bytes), { headers: {
    "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=300",
  } });
}
