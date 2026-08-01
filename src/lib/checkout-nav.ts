import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * O pixel da Utmify intercepta cliques em links de checkout (preventDefault +
 * re-dispatch assíncrono). Se a requisição do pixel falhar, o clique fica
 * "travado" e a navegação nunca acontece.
 *
 * Este fallback garante que, mesmo assim, o usuário chegue ao checkout:
 * se após um curto intervalo a rota não mudou, navegamos manualmente.
 */
export function useCheckoutFallbackNav() {
  const router = useRouter();

  return useCallback(
    (to: string) => {
      if (typeof window === "undefined") return;
      const from = window.location.pathname;
      window.setTimeout(() => {
        if (window.location.pathname === from) {
          router.navigate({ to, search: (prev: Record<string, unknown>) => prev as never } as never);
        }
      }, 600);
    },
    [router],
  );
}
