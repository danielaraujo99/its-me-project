// Server-only client for the external Hyro Supabase (extension panel DB).
// Never import from client-reachable modules at top-level; use dynamic import.
import { createClient } from "@supabase/supabase-js";

function readEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  try {
    Object.assign(out, process.env as Record<string, string | undefined>);
  } catch { /* no process */ }
  try {
    // Vite/Vercel builds may inline VITE_* values into import.meta.env.
    const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (meta) for (const [k, v] of Object.entries(meta)) if (out[k] === undefined) out[k] = v;
  } catch { /* no import.meta.env */ }
  return out;
}

export function getHyroDbConfig() {
  const env = readEnv();
  const norm = (n: string) => n.toUpperCase().replace(/^VITE_/, "");
  const find = (test: (name: string) => boolean) => {
    for (const [rawName, rawValue] of Object.entries(env)) {
      const v = typeof rawValue === "string" ? rawValue.trim() : "";
      if (!v) continue;
      if (test(norm(rawName))) return v;
    }
    return undefined;
  };

  // Accept HYRO_*/HERO_* spellings, with or without VITE_ prefix,
  // anon or service-role keys (Vercel env naming varies).
  const isHyro = (n: string) => n.startsWith("HYRO_") || n.startsWith("HERO_");
  const url =
    find((n) => isHyro(n) && n.endsWith("SUPABASE_URL")) ??
    find((n) => isHyro(n) && n.includes("SUPABASE") && n.includes("URL"));
  const key =
    find((n) => isHyro(n) && n.endsWith("SUPABASE_SERVICE_ROLE_KEY")) ??
    find((n) => isHyro(n) && n.endsWith("SUPABASE_ANON_KEY")) ??
    find((n) => isHyro(n) && n.includes("SUPABASE") && n.includes("KEY"));

  return { url, key, configured: Boolean(url && key) };
}

// Names only (never values) — useful to debug misnamed Vercel env vars.
export function getHyroDbEnvNames(): string[] {
  return Object.keys(readEnv()).filter((n) => /^(VITE_)?(HYRO|HERO)_/i.test(n));
}

export function getHyroDb() {
  const { url, key, configured } = getHyroDbConfig();
  if (!configured || !url || !key) {
    const seen = getHyroDbEnvNames();
    throw new Error(
      `Banco Hyro não configurado no servidor${seen.length ? ` (vars encontradas: ${seen.join(", ")})` : " (nenhuma var HYRO_/HERO_ encontrada no ambiente)"}`,
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

