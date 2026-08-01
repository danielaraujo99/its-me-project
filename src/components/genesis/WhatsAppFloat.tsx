import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useActiveCharge } from "@/lib/pix-store";

const WHATS_NUMBER = "5527981359051";
const WHATS_URL = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(
  "Olá! Vim do site Love Hyro e gostaria de ajuda.",
)}`;

export function WhatsAppFloat() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const charge = useActiveCharge();
  // Enquanto existe um PIX aguardando pagamento, escondemos o botão.
  // Assim que for pago ou expirar, o charge deixa de ser "pending" e ele volta.
  const hidden = charge?.status === "pending";

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setOpen(true), 1400);
    const c = setTimeout(() => setOpen(false), 6500);
    return () => {
      clearTimeout(t);
      clearTimeout(c);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex items-end gap-3 sm:bottom-6 sm:right-6">
      {/* Chat teaser bubble */}
      <motion.button
        type="button"
        onClick={() => setOpen(false)}
        initial={false}
        animate={
          open && mounted
            ? { opacity: 1, x: 0, scale: 1, pointerEvents: "auto" }
            : { opacity: 0, x: 12, scale: 0.96, pointerEvents: "none" }
        }
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="mb-1 hidden max-w-[240px] items-start gap-2 rounded-2xl border border-white/10 bg-[#131024]/85 px-3.5 py-2.5 text-left shadow-[0_18px_50px_-18px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:flex"
        aria-label="Fechar mensagem"
      >
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#25D366] shadow-[0_0_10px_#25D366]" />
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Suporte Love Hyro
          </span>
          <span className="mt-0.5 text-[13px] text-white/90">
            Precisa de ajuda? Responde em minutos.
          </span>
        </span>
      </motion.button>

      {/* Button */}
      <motion.a
        href={WHATS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        initial={{ opacity: 0, scale: 0.7, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 220, damping: 20 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.93 }}
        onHoverStart={() => setOpen(true)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full sm:h-[58px] sm:w-[58px]"
      >
        {/* Outer soft glow */}
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full opacity-70 blur-xl transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle, rgba(37,211,102,0.55) 0%, rgba(37,211,102,0) 70%)",
          }}
        />

        {/* Pulse rings */}
        {!reduce && (
          <>
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-[#25D366]/50"
              animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-[#25D366]/40"
              animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeOut",
                delay: 1.1,
              }}
            />
          </>
        )}

        {/* Core disc */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_30px_-8px_rgba(37,211,102,0.55)]"
          style={{
            background:
              "radial-gradient(120% 120% at 30% 20%, #3EE07A 0%, #25D366 45%, #128C7E 100%)",
          }}
        />
        {/* Gloss */}
        <span
          aria-hidden
          className="absolute left-[14%] right-[14%] top-[10%] h-[38%] rounded-full opacity-70"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
            filter: "blur(2px)",
          }}
        />
        {/* Ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full ring-1 ring-white/25"
        />

        {/* Icon */}
        <motion.svg
          viewBox="0 0 32 32"
          className="relative h-7 w-7 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] sm:h-[30px] sm:w-[30px]"
          fill="white"
          aria-hidden
          animate={
            reduce
              ? undefined
              : { rotate: [0, -8, 8, -6, 6, 0] }
          }
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatDelay: 4.5,
            ease: "easeInOut",
          }}
        >
          <path d="M19.11 17.28c-.29-.15-1.7-.84-1.97-.93-.26-.1-.46-.15-.65.14-.19.29-.74.93-.91 1.12-.17.19-.34.22-.62.07-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.65-1.57-.9-2.15-.24-.57-.48-.49-.65-.5l-.55-.01c-.19 0-.51.07-.77.36-.26.29-1.01.99-1.01 2.42 0 1.43 1.04 2.81 1.18 3.01.15.19 2.04 3.11 4.94 4.36.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.11.56-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM16.02 5.33c-5.9 0-10.7 4.8-10.7 10.7 0 1.89.5 3.73 1.44 5.35L5 27.33l6.11-1.6c1.56.85 3.32 1.3 5.11 1.3h.01c5.9 0 10.7-4.8 10.7-10.7 0-2.86-1.11-5.55-3.13-7.57-2.02-2.02-4.71-3.14-7.58-3.14zm0 19.6h-.01c-1.6 0-3.16-.43-4.53-1.24l-.32-.19-3.62.95.97-3.53-.21-.34c-.89-1.42-1.36-3.06-1.36-4.75 0-4.9 3.99-8.89 8.9-8.89 2.37 0 4.61.93 6.29 2.61 1.68 1.68 2.61 3.92 2.6 6.29 0 4.9-3.99 8.89-8.89 8.89z" />
        </motion.svg>

        {/* Notification dot */}
        <motion.span
          aria-hidden
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 400, damping: 18 }}
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#128C7E] shadow-[0_2px_6px_rgba(0,0,0,0.35)] ring-2 ring-[#0B0715]"
        >
          1
        </motion.span>
      </motion.a>
    </div>
  );
}
