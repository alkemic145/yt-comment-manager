import crypto from "crypto";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const SESSION_COOKIE = "triage_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAppSession(userId: string) {
  const supabase = createSupabaseServerClient();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("auth_sessions").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

interface AppUserRow {
  id: string;
  google_sub: string;
  email: string | null;
  name: string | null;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("auth_sessions")
    .select("user_id, expires_at, app_users(id, google_sub, email, name)")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data?.app_users) return null;

  const rawAppUser = data.app_users as unknown;
  const appUser = Array.isArray(rawAppUser) ? rawAppUser[0] : rawAppUser;

  if (!appUser) return null;

  return appUser as AppUserRow;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
