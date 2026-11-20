import { headers } from "next/headers";
import { authEnabled, getAuth } from "@/lib/auth-config";
import { database } from "@/lib/database";
import { username } from "@/lib/form-data";

export async function GET(request: Request) {
  if (!authEnabled() || !await getAuth().api.getSession({ headers: await headers() })) {
    return new Response(null, { status: 401 });
  }
  const handle = username.safeParse(new URL(request.url).searchParams.get("value"));
  if (!handle.success) return Response.json({ available: false }, { status: 400 });
  const { rowCount } = await database().query("SELECT 1 FROM loopr.profiles WHERE username = $1", [handle.data]);
  return Response.json({ available: rowCount === 0 }, { headers: { "Cache-Control": "no-store" } });
}
