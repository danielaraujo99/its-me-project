import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PixMiniCard } from "@/components/genesis/PixMiniCard";
import { WhatsAppFloat } from "@/components/genesis/WhatsAppFloat";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Love Hyro - Extensão de Créditos Ilimitados para Lovable" },
      { name: "description", content: "Love Hyro: extensão para congelar créditos no Lovable.dev. Ative via PIX ou cartão e libere na hora, a partir de R$ 7,90." },
      { name: "keywords", content: "lovable ilimitado, créditos lovable, extensão lovable, lovable.dev, love hyro, créditos infinitos lovable, congelar créditos, lovable unlimited, extensão créditos infinitos" },
      { name: "author", content: "Love Hyro" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "theme-color", content: "#0B0715" },
      { property: "og:title", content: "Love Hyro - Extensão de Créditos Ilimitados para Lovable" },
      { property: "og:description", content: "Congele seus créditos no Lovable.dev com a extensão Love Hyro. Ativação imediata via PIX ou cartão. Planos a partir de R$ 7,90." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Love Hyro" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:url", content: "https://www.lovehyro.store/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Love Hyro - Extensão de Créditos Ilimitados para Lovable" },
      { name: "twitter:description", content: "Congele seus créditos no Lovable.dev com a extensão Love Hyro. Ativação imediata via PIX ou cartão." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5d8300be-0577-45bc-b72c-d951bc40735e/id-preview-d81dd9e4--f3ee8690-1aa5-4b2e-8d61-a5794424fd38.lovable.app-1784423157783.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5d8300be-0577-45bc-b72c-d951bc40735e/id-preview-d81dd9e4--f3ee8690-1aa5-4b2e-8d61-a5794424fd38.lovable.app-1784423157783.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://www.lovehyro.store/" },
      { rel: "preload", as: "image", href: "/assets/hero-visual.webp", fetchpriority: "high" } as any,
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },

    ],
    scripts: [
      {
        children: `window.pixelId = "6a5f6d81afa17a274b094a96";var a = document.createElement("script");a.setAttribute("async", "");a.setAttribute("defer", "");a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");document.head.appendChild(a);`,
      },
      {
        src: "https://cdn.utmify.com.br/scripts/utms/latest.js",
        async: true,
        defer: true,
        "data-utmify-prevent-xcod-sck": "",
        "data-utmify-prevent-subids": "",
      } as any,
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Love Hyro",
          url: "https://www.lovehyro.store/",
          logo: "https://www.lovehyro.store/assets/lovehyro-mark.jpg",
          sameAs: [],
          description: "Extensão de créditos ilimitados para Lovable.dev com ativação imediata via PIX ou cartão.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Love Hyro",
          url: "https://www.lovehyro.store/",
          inLanguage: "pt-BR",
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    import("../lib/cache-bust").then((m) => m.runCacheMaintenance());
    import("../lib/site-guard").then((m) => m.installSiteGuard());
    import("../lib/utm-tracker").then((m) => m.captureUtms());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <PixMiniCard />
      <WhatsAppFloat />
    </QueryClientProvider>

  );
}
