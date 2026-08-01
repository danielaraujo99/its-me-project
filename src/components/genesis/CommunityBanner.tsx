import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Users } from "lucide-react";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M16.02 3C8.83 3 3 8.83 3 16.02c0 2.3.6 4.54 1.75 6.52L3 29l6.66-1.72a12.98 12.98 0 0 0 6.36 1.64h.01C23.2 28.92 29 23.1 29 15.92 29 12.44 27.65 9.17 25.19 6.7A12.85 12.85 0 0 0 16.02 3zm0 23.7h-.01a10.7 10.7 0 0 1-5.45-1.49l-.39-.23-3.95 1.02 1.05-3.84-.25-.4a10.66 10.66 0 0 1-1.64-5.7C5.38 10.14 10.14 5.38 16.03 5.38c2.83 0 5.5 1.1 7.5 3.1a10.55 10.55 0 0 1 3.1 7.44c0 5.88-4.76 10.64-10.6 10.78zm5.83-7.98c-.32-.16-1.9-.94-2.19-1.05-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.19.21-.37.24-.7.08-.32-.16-1.36-.5-2.6-1.6a9.77 9.77 0 0 1-1.8-2.24c-.19-.32-.02-.5.14-.66.14-.14.32-.37.48-.55.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.72-1.74-.99-2.38-.26-.62-.53-.54-.72-.55l-.61-.01c-.21 0-.55.08-.83.4-.29.32-1.09 1.06-1.09 2.59 0 1.53 1.12 3.01 1.28 3.22.16.21 2.2 3.35 5.32 4.7.74.32 1.32.51 1.77.65.75.24 1.42.2 1.96.12.6-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37z" />
    </svg>
  );
}

export function CommunityBanner() {
  const [showModal, setShowModal] = useState(false);

  return (
    <section className="relative py-12">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <button
          onClick={() => setShowModal(true)}
          className="group w-full flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#161029] to-[#1D1638] p-4 sm:p-5 hover:border-[#7A5CFF]/40 transition-colors text-left"
        >
          <div className="h-12 w-12 rounded-xl bg-[#25D366]/15 border border-[#25D366]/25 grid place-items-center shrink-0">
            <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Entre na comunidade Love Hyro</div>
            <div className="text-xs text-white/55 mt-0.5 truncate">
              Suporte rápido, novidades em primeira mão e networking com outros usuários.
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-center px-2">
            <div>
              <div className="text-sm font-semibold">2k+</div>
              <div className="text-[10px] uppercase tracking-wider text-white/45">Membros</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-300">Online</div>
              <div className="text-[10px] uppercase tracking-wider text-white/45">Agora</div>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#5B3DF5] grid place-items-center shrink-0 group-hover:bg-[#6a4cf7] transition-colors">
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#131024] p-6 shadow-2xl"
            >
              <button
                onClick={() => setShowModal(false)}
                aria-label="Fechar"
                className="absolute right-3 top-3 h-8 w-8 grid place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="h-12 w-12 rounded-xl bg-[#5B3DF5]/15 border border-[#7A5CFF]/25 grid place-items-center">
                <Users className="h-5 w-5 text-[#A78BFA]" />
              </div>

              <h3 className="mt-4 text-lg font-semibold">Nosso 4º grupo está aberto</h3>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">
                Acabamos de abrir o quarto grupo oficial da Love Hyro. É lá que postamos as
                atualizações da extensão, dicas de uso e novidades em primeira mão. Entra e fica
                sempre por dentro.
              </p>

              <a
                href="https://chat.whatsapp.com/BoAKE1Bbx1E5KG8fcDbNr1"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowModal(false)}
                className="mt-6 w-full h-10 rounded-full bg-[#5B3DF5] hover:bg-[#6a4cf7] transition-colors text-sm font-medium inline-flex items-center justify-center gap-2"
              >
                <WhatsAppIcon className="h-4 w-4" /> Entrar
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
