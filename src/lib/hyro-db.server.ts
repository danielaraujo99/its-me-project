// Server-only client for the external Hyro Supabase (extension panel DB).
// Never import from client-reachable modules at top-level; use dynamic import.
import { createClient } from "@supabase/supabase-js";

export function getHyroDbConfig() {
  const env = process.env as Record<string, string | undefined>;
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = env[n]?.trim();
      if (v) return v;
    }
    return undefined;
  };
  // Accept both HYRO_* and HERO_* spellings, anon or service-role keys.
  const url = pick("HYRO_SUPABASE_URL", "HERO_SUPABASE_URL");
  const key = pick(
    "HYRO_SUPABASE_SERVICE_ROLE_KEY",
    "HERO_SUPABASE_SERVICE_ROLE_KEY",
    "HYRO_SUPABASE_ANON_KEY",
    "HERO_SUPABASE_ANON_KEY",
  );
  return { url, key, configured: Boolean(url && key) };
}


export function getHyroDb() {
  const { url, key, configured } = getHyroDbConfig();
  if (!configured || !url || !key) throw new Error("Banco Hyro não configurado no servidor");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
