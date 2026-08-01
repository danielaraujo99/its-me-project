import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

function applySecurityHeaders(response: Response): Response {
  try {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      if (!response.headers.has(k)) response.headers.set(k, v);
    }
  } catch {
    // headers immutable on some responses — ignore
  }
  return response;
}

// Cache-Control policy:
//  - hashed/static build assets -> long lived + immutable
//  - server functions / APIs     -> no-store (private, real-time data)
//  - HTML documents              -> no-cache (always revalidate, never stale UI)
function applyCachePolicy(request: Request, response: Response): Response {
  try {
    if (response.headers.has("Cache-Control")) return response;
    const path = new URL(request.url).pathname;
    const contentType = response.headers.get("content-type") ?? "";

    const isBuildAsset =
      path.startsWith("/_build/") ||
      path.startsWith("/assets/") ||
      /\.[0-9a-f]{8,}\.(js|css|woff2?|png|jpe?g|webp|svg|avif)$/i.test(path);

    if (isBuildAsset) {
      response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return response;
    }

    if (path.startsWith("/_serverFn/") || path.startsWith("/api/")) {
      response.headers.set("Cache-Control", "no-store, must-revalidate");
      response.headers.set("Vary", "Cookie, Authorization");
      return response;
    }

    if (contentType.includes("text/html")) {
      response.headers.set("Cache-Control", "no-cache, max-age=0, must-revalidate");
    }
  } catch {
    // headers immutable on some responses - ignore
  }
  return response;
}

const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const response = await next();
  if (response instanceof Response) return applyCachePolicy(request, applySecurityHeaders(response));
  return response;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    const response = await next();
    return response;
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return applySecurityHeaders(
      new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware],
}));
