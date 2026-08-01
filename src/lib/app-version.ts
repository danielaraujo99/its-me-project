// Build identity used to detect that the browser is running an outdated copy
// of the app. `__APP_BUILD_ID__` is injected at build time by vite.config.ts,
// so every deploy produces a new value.
declare const __APP_BUILD_ID__: string | undefined;

function readInjectedBuildId(): string | null {
  try {
    return typeof __APP_BUILD_ID__ === "string" && __APP_BUILD_ID__ ? __APP_BUILD_ID__ : null;
  } catch {
    return null;
  }
}

const envVersion =
  (import.meta.env["VITE_APP_VERSION"] as string | undefined) ||
  (import.meta.env["VITE_VERCEL_GIT_COMMIT_SHA"] as string | undefined) ||
  null;

export const APP_VERSION: string = envVersion || readInjectedBuildId() || "dev";
