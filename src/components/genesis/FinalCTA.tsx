import { motion } from "framer-motion";
import { ArrowRight, Download, Rocket } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCheckoutFallbackNav } from "@/lib/checkout-nav";

export function FinalCTA() {
  const fallbackNav = useCheckoutFallbackNav();
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0E0A1E] px-6 py-14 sm:px-12 sm:py-20 text-center"
        >
          {/* soft purple radial glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(122,92,255,0.22),transparent_65%)] blur-2xl" />
          </div>

          {/* diagonal hairlines */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
            <div className="absolute top-0 left-[18%] h-full w-px bg-gradient-to-b from-transparent via-white to-transparent rotate-[14deg] origin-top" />
            <div className="absolute top-0 right-[18%] h-full w-px bg-gradient-to-b from-transparent via-white to-transparent -rotate-[14deg] origin-top" />
          </div>

          {/* subtle gradient border */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-px">
            <div className="h-full w-full rounded-3xl bg-gradient-to-br from-[#7A5CFF]/40 via-transparent to-[#5B3DF5]/30" />
          </div>

          <div className="relative">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Rocket className="h-5 w-5 text-[#A78BFA]" />
            </div>

            <h2 className="mt-6 text-3xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.05]">
              Bora congelar seus créditos
              <br />
              <span className="text-gradient">no próximo clique?</span>
            </h2>

            <p className="mx-auto mt-5 max-w-lg text-sm sm:text-base text-white/55 leading-relaxed">
              Milhares de usuários já economizam créditos todos os dias com a extensão Love Hyro. Falta só você.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/checkout/$planId"
                params={{ planId: "HYRO-01001" }}
                search={(prev: Record<string, unknown>) => prev as never}
                className="group inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#0B0715] hover:bg-white/90 transition-colors"
              >
                Testar por R$ 7,90
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/download"
                search={(prev: Record<string, unknown>) => prev as never}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 text-sm font-semibold text-white/90 hover:bg-white/[0.08] transition-colors"
              >
                <Download className="h-4 w-4 text-[#A78BFA]" />
                Baixar agora
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
