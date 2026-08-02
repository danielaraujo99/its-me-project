import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { DashboardMock } from "./DashboardMock";

export function Hero() {
  return (
    <section id="hero" className="relative pt-28 sm:pt-32 pb-14 sm:pb-16 lg:pt-40 lg:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white/70"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#A78BFA] opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
              </span>
              EXTENSÃO CRÉDITOS ILIMITADOS
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 text-[40px] leading-[1.05] sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] sm:leading-[1.02]"
            >
              Congele seus<br />
              créditos com a<br />
              <span className="text-gradient">Extensão</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 sm:mt-6 max-w-lg text-[15px] sm:text-lg text-white/60 leading-relaxed"
            >
              A ferramenta essencial pra quem não aceita perder créditos. Ative o
              congelamento instantâneo no seu navegador, com PIX e liberação na hora.
            </motion.p>


            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3"
            >
              <a href="#produtos" className="group h-12 px-5 sm:px-6 rounded-full text-sm font-semibold text-white bg-[#5B3DF5] hover:bg-[#6a4cf7] transition-colors inline-flex items-center gap-2 shadow-[0_10px_30px_-10px_rgba(91,61,245,0.7)]">
                Ver produtos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a href="#tutorial" className="h-12 px-5 sm:px-6 rounded-full text-sm font-semibold text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#A78BFA]" />
                Como funciona
              </a>
            </motion.div>


            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-10 sm:mt-12 grid grid-cols-3 gap-4 sm:gap-8 max-w-md"
            >
              {[
                { k: "+2k", v: "Pedidos entregues" },
                { k: "+4k", v: "Clientes ativos" },
                { k: "24/7", v: "Suporte dedicado" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight">{s.k}</div>
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-white/45 mt-1 leading-tight">{s.v}</div>
                </div>
              ))}
            </motion.div>

          </div>

          <DashboardMock />
        </div>
      </div>
    </section>
  );
}
