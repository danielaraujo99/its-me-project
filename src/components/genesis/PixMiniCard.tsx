import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowUpRight } from "lucide-react";
import { PixIcon } from "./PixIcon";
import { formatBRL } from "@/lib/plans";
import { clearActiveCharge, useActiveCharge } from "@/lib/pix-store";

/**
 * Global floating card shown when a PIX charge is active but the modal is closed.
 * Persists across navigation so the user never loses an in-progress payment.
 */
export function PixMiniCard() {
  const charge = useActiveCharge();
  const navigate = useNavigate();

  if (!charge) return null;

  const remaining = Math.max(0, charge.expiresAt - Date.now());
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  const totalMs = 5 * 60 * 1000;
  const progress = Math.max(0, Math.min(1, remaining / totalMs));

  const open = () => {
    navigate({
      to: "/checkout/$planId",
      params: { planId: charge.planId },
    })
      .catch(() => {
        window.location.href = `/checkout/${charge.planId}`;
      })
      .finally(() => {
        // Ask the checkout page to (re)open the modal for the active charge.
        // Fires on next tick to ensure listener on the target route is mounted.
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("lovehyro:pix:open"));
        }, 0);
      });
  };


  return (
    <AnimatePresence>
      <motion.div
        key="pix-mini"
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="fixed z-[90] inset-x-0 bottom-3 sm:bottom-5 mx-auto w-[min(100%-1.5rem,360px)] px-0"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#120C24]/95 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(91,61,245,0.6)]">
          <button
            onClick={(e) => { e.stopPropagation(); clearActiveCharge(); }}
            aria-label="Descartar pagamento"
            className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={open}
            className="w-full text-left p-3 pr-9 flex items-center gap-3 group"
          >
            <div className="h-10 w-10 rounded-xl bg-white grid place-items-center shrink-0">
              <PixIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-wider text-white/50 uppercase">Pix em aberto</div>
              <div className="text-[13px] font-semibold text-white truncate">
                {formatBRL(charge.amount)} · <span className="text-white/60 font-mono tabular-nums">{mm}:{ss}</span>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-white/50 group-hover:text-white transition-colors shrink-0" />
          </button>

          <div className="h-1 w-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-[#7A5CFF] to-[#5B3DF5] transition-[width] duration-500 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
