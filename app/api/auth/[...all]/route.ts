import { z } from "zod";
import { authEnabled, getAuth } from "@/lib/auth-config";
import { database } from "@/lib/database";
import { username } from "@/lib/form-data";

type RouteContext = { params: Promise<{ all: string[] }> };
const blocked = new Set(["change-email", "change-password", "unlink-account", "set-password"]);

export function GET(request: Request) {
  return authEnabled() ? getAuth().handler(request) : new Response("Authentication is not configured.", { status: 503 });
}

export async function POST(request: Request, context: RouteContext) {
  if (!authEnabled()) return new Response("Authentication is not configured.", { status: 503 });
  const path = (await context.params).all.join("/");
  if (blocked.has(path.replace(/\/+$/, ""))) {
    return new Response("Use account settings for this action.", { status: 403 });
  }
  if (path !== "sign-in/identifier") return getAuth().handler(request);
  const parsed = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Enter your email or username and password." }, { status: 400 });
  const { identifier, password } = parsed.data;
  let email = identifier.toLowerCase();
  if (!identifier.slice(1).includes("@")) {
    const handle = username.safeParse(identifier.replace(/^@/, ""));
    const result = handle.success ? await database().query<{ email: string }>(
      'SELECT u.email FROM loopr.profiles p JOIN public."user" u ON u.id = p.id WHERE p.username = $1',
      [handle.data],
    ) : undefined;
    email = result?.rows[0]?.email ?? "no-account@loopr.invalid";
  }
  const url = new URL(request.url);
  url.pathname = "/api/auth/sign-in/email";
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  return getAuth().handler(new Request(url, { method: "POST", headers, body: JSON.stringify({ email, password }) }));
}
