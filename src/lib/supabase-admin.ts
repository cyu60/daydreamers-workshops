import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: any = null;

/**
 * Returns a Supabase client with service role (admin) permissions.
 * Cast to `any` because we don't have generated DB types — all queries
 * are validated at runtime against the actual schema.
 */
export function getSupabaseAdmin(): any {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase admin credentials not configured");
    }
    _admin = createClient(url, key);
  }
  return _admin;
}
