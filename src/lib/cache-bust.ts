// Versioned client-side cache maintenance.
//
// Problem it solves: after a deploy, browsers kept serving stale HTML/assets
// from Cache Storage or a leftover Service Worker, and stale temporary state
// from localStorage/sessionStorage. This module compares the running build
// with the last build seen by this browser and performs a *selective* cleanup.
//
// It never wipes storage blindly: business-critical data (licenses, active PIX
// charge, device id, UTM attribution) is always preserved.

import { APP_VERSION } from "./app-version";

const VERSION_KEY = "lovehyro:app:version";
const RELOAD_GUARD_KEY = "lovehyro:app:version-reloaded";

/** Keys that must survive every upgrade. */
const PRESERVED_KEYS = new Set<string>([
  "lovehyro:license:latest",
  "lovehyro:licenses:list",
  "lovehyro:pix:active",
  "lovehyro:pix:history",
  "lovehyro:device:id",
  "lovehyro:utms",
  "lovehyro:utmify-admin-token",
  VERSION_KEY,
]);

/** Prefixes considered disposable UI/temporary state. */
const DISPOSABLE_PREFIXES = ["lovehyro:tmp:", "lovehyro:cache:", "lovehyro:ui:"];

function isDisposable(key: string): boolean {
  if (PRESERVED_KEYS.has(key)) return false;
  if (DISPOSABLE_PREFIXES.some((p) => key.startsWith(p))) return true;
  // Legacy/unknown keys from previous builds of this app only.
  return key.startsWith("lovehyro:");
}

function pruneStorage(store: Storage) {
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key && isDisposable(key)) doomed.push(key);
  }
  for (const key of doomed) {
    try {
      store.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

async function clearHttpCaches() {
  if (typeof caches === "undefined") return;
  try {
    const names = await caches.keys();
    await Promise.allSettled(names.map((n) => caches.delete(n)));
  } catch {
    /* ignore */
  }
}

async function unregisterStaleServiceWorkers() {
  // This app is not a PWA; any registration is a leftover that can pin old HTML.
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(regs.map((r) => r.unregister()));
    return regs.length > 0;
  } catch {
    return false;
  }
}

/**
 * Runs once on app boot. Returns true when a cleanup happened.
 */
export async function runCacheMaintenance(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(VERSION_KEY);
  } catch {
    return false;
  }

  const hadServiceWorker = await unregisterStaleServiceWorkers();

  if (stored === APP_VERSION) {
    try {
      window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      /* ignore */
    }
    return false;
  }

  await clearHttpCaches();

  try {
    pruneStorage(window.localStorage);
  } catch {
    /* ignore */
  }
  try {
    pruneStorage(window.sessionStorage);
  } catch {
    /* ignore */
  }

  try {
    window.localStorage.setItem(VERSION_KEY, APP_VERSION);
  } catch {
    /* ignore */
  }

  // First install (no previous version) never needs a reload.
  if (!stored) return true;

  // Reload at most once per version, so we can never loop.
  let alreadyReloaded = false;
  try {
    alreadyReloaded = window.sessionStorage.getItem(RELOAD_GUARD_KEY) === APP_VERSION;
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, APP_VERSION);
  } catch {
    alreadyReloaded = true;
  }

  if (!alreadyReloaded && hadServiceWorker) {
    window.location.reload();
  }
  return true;
}
