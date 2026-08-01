// Persists UTM / src / sck parameters seen on the landing URL so we can
// forward them to Utmify when the order is created and when it is paid.
// First touch wins and the value survives reloads (localStorage + sessionStorage).
const KEY = "lovehyro:utms";
const FIELDS = ["src", "sck", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term"] as const;
export type Utms = Partial<Record<(typeof FIELDS)[number], string>>;

function read(store: Storage | undefined): Utms {
  try {
    const raw = store?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Utms) : {};
  } catch {
    return {};
  }
}

function write(v: Utms) {
  const s = JSON.stringify(v);
  try { window.sessionStorage.setItem(KEY, s); } catch { /* ignore */ }
  try { window.localStorage.setItem(KEY, s); } catch { /* ignore */ }
}

export function captureUtms(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const cur = getUtms();
    let touched = false;

    for (const k of FIELDS) {
      const v = url.searchParams.get(k);
      if (v && !cur[k]) {
        cur[k] = v;
        touched = true;
      }
    }

    // Fallbacks usados por trafego pago quando a URL nao traz src/sck.
    if (!cur.src) {
      const alt = url.searchParams.get("xcod") || url.searchParams.get("fbclid") || url.searchParams.get("gclid");
      if (alt) { cur.src = alt; touched = true; }
    }
    if (!cur.utm_source) {
      if (url.searchParams.get("fbclid")) { cur.utm_source = "FB"; touched = true; }
      else if (url.searchParams.get("gclid")) { cur.utm_source = "GOOGLE"; touched = true; }
    }

    if (touched) write(cur);
  } catch {
    /* ignore */
  }
}

export function getUtms(): Utms {
  if (typeof window === "undefined") return {};
  const session = read(window.sessionStorage);
  if (Object.keys(session).length) return session;
  const local = read(window.localStorage);
  if (Object.keys(local).length) {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(local)); } catch { /* ignore */ }
  }
  return local;
}
