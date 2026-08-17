import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * All reads/writes to `youtube_connections` go through this module.
 *
 * Why this exists: the Supabase client used across this app authenticates
 * with the service role key, which bypasses Row Level Security entirely.
 * That means the *only* thing stopping one user from reading or modifying
 * another user's YouTube connection is remembering to add
 * `.eq("user_id", user.id)` to every query, by hand, in every route.
 *
 * Centralizing that here means the user-scoping filter is written and
 * reviewed once, instead of duplicated (and potentially forgotten) across
 * every API route that touches this table.
 *
 * Longer-term, the more robust fix is enforcing this at the database
 * level via real RLS policies (which requires the app to authenticate to
 * Postgres as the specific user, e.g. via Supabase Auth or forwarded JWT
 * claims, rather than always using the service role key). That's a bigger
 * architectural change than a single-file fix — this module is a
 * meaningful mitigation in the meantime, not a replacement for it.
 */

export interface YoutubeConnectionSummary {
  channel_id: string;
  channel_title: string | null;
}

export interface YoutubeConnectionWithTokens {
  id: string;
  channel_id: string;
  channel_title: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
}

export interface YoutubeConnectionUpsertPayload {
  user_id: string;
  channel_id: string;
  channel_title?: string | null;
  access_token: string;
  refresh_token?: string;
  expires_at: string | null;
}

export interface YoutubeConnectionTokenUpdate {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
}

/**
 * Returns the given user's most recently connected YouTube channel
 * (id + title only — no tokens). Used anywhere the app just needs to
 * display which channel is connected.
 */
export async function getConnectionSummaryForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<YoutubeConnectionSummary | null> {
  const { data, error } = await supabase
    .from("youtube_connections")
    .select("channel_id, channel_title")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as YoutubeConnectionSummary;
}

/**
 * Returns the given user's most recently connected YouTube channel,
 * including its (encrypted) tokens. Used only where the caller needs to
 * make authenticated calls to the YouTube API on the user's behalf.
 */
export async function getConnectionWithTokensForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<YoutubeConnectionWithTokens | null> {
  const { data, error } = await supabase
    .from("youtube_connections")
    .select(
      "id, channel_id, channel_title, access_token, refresh_token, expires_at"
    )
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as YoutubeConnectionWithTokens;
}

/**
 * Creates or updates a user's YouTube connection. Scoped implicitly:
 * `user_id` is part of the payload the caller must provide, tying the
 * row to the correct account at write time.
 */
export async function upsertConnection(
  supabase: SupabaseClient,
  payload: YoutubeConnectionUpsertPayload
) {
  return supabase
    .from("youtube_connections")
    .upsert(payload, { onConflict: "user_id,channel_id" });
}

/**
 * Updates token fields on an existing connection (e.g. after Google
 * refreshes an access token). Scoped by both the connection's own id and
 * the owning user_id, so this can never update a row belonging to
 * someone else even if the wrong id were ever passed in by mistake.
 */
export async function updateConnectionTokens(
  supabase: SupabaseClient,
  connectionId: string,
  userId: string,
  updates: YoutubeConnectionTokenUpdate
) {
  return supabase
    .from("youtube_connections")
    .update(updates)
    .eq("id", connectionId)
    .eq("user_id", userId);
}
