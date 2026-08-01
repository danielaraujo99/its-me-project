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

    // Só valores reais dos parâmetros oficiais — nada inventado,
    // para não sujar a atribuição no painel da Utmify.
    for (const k of FIELDS) {
      const v = (url.searchParams.get(k) || "").trim();
      if (v && !cur[k]) {
        cur[k] = v;
        touched = true;
      }
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
