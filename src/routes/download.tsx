import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download as DownloadIcon,
  KeyRound,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  PlayCircle,
  Chrome,
  Terminal,
} from "lucide-react";
import { Background } from "@/components/genesis/Background";
import { validateLicense } from "@/lib/hyro-validate.functions";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Baixar Extensão - Love Hyro" },
      { name: "description", content: "Baixe a extensão Love Hyro validando sua chave de licença ou chave teste." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DownloadPage,
});

const EXT_URL = "https://drive.google.com/file/d/1L2WH-F66YWsQvX_M_N76Ab632WNunEzk/view?usp=sharing";
const WHATSAPP_URL = "https://wa.me/5511999999999";

function DownloadPage() {
  const validate = useServerFn(validateLicense);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<{ planLabel?: string; expiresAt?: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    setError(null);
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Digite sua chave de licença ou chave teste.");
      return;
    }

    if (!ok) {
      setLoading(true);
      try {
        const res = await validate({ data: { key: trimmed } });
        if (!res.valid) {
          setError(res.reason || "Chave inválida.");
          setLoading(false);
          return;
        }
        setOk({ planLabel: res.planLabel, expiresAt: res.expiresAt });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao validar.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    setDownloading(true);
    try {
      window.open(EXT_URL, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no download");
    } finally {
      setDownloading(false);
    }
  }


  const expiresLabel = ok?.expiresAt
    ? new Date(ok.expiresAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;

  const steps = [
    { title: "Descompacte o arquivo", desc: "Extraia o .zip baixado em uma pasta permanente do seu computador." },
    { title: "Abra as extensões do Chrome", desc: <>Cole na barra de endereço: <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11.5px] font-mono text-[#A78BFA]">chrome://extensions</code></> },
    { title: "Ative o Modo do desenvolvedor", desc: "Alterne o interruptor no canto superior direito da página." },
    { title: "Carregar sem compactação", desc: "Clique no botão e selecione a pasta que você extraiu no passo 1." },
    { title: "Pronto para usar", desc: "Fixe a extensão na barra e faça login com sua chave Love Hyro." },
  ];

  return (
    <div className="dark relative min-h-screen text-white overflow-x-hidden">
      <Background />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#7A5CFF] to-[#5B3DF5] shadow-[0_8px_24px_-8px_rgba(122,92,255,0.7)]">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Love Hyro</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </header>

      <main className="relative pb-24 pt-4 sm:pt-8">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11.5px] font-medium text-white/70 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-[#A78BFA]" /> Extensão oficial v1.0
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-[-0.035em] leading-[1.05]">
              Ative sua chave e{" "}
              <span className="bg-gradient-to-r from-white via-[#C9B8FF] to-[#7A5CFF] bg-clip-text text-transparent">
                baixe a extensão
              </span>
            </h1>
            <p className="mx-auto mt-3 text-[14px] sm:text-[15px] text-white/55 leading-relaxed">
              Validação em tempo real. O download é liberado assim que sua chave é reconhecida.
            </p>
          </motion.div>

          {/* Activation panel - centered, terminal aesthetic */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative mt-10 mx-auto max-w-2xl"
          >
            {/* glow halo */}
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] bg-[radial-gradient(60%_60%_at_50%_20%,rgba(122,92,255,0.35),transparent_70%)] blur-2xl" />

            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0E0A1E]/85 backdrop-blur-xl">
              {/* faux window bar */}
              <div className="flex items-center gap-2 border-b border-white/5 bg-black/30 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <div className="mx-auto flex items-center gap-1.5 text-[11px] font-mono text-white/45">
                  <Terminal className="h-3 w-3" /> hyro / activate
                </div>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-300/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> online
                </span>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#7A5CFF]/30 bg-[#5B3DF5]/15">
                    <KeyRound className="h-4.5 w-4.5 text-[#A78BFA]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[17px] sm:text-lg font-semibold tracking-tight">Insira sua chave</h2>
                    <p className="mt-0.5 text-[12.5px] text-white/50">Aceita licenças HYRO e chaves TESTE.</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[#7A5CFF] text-sm select-none">$</span>
                    <input
                      value={key}
                      onChange={(e) => { setKey(e.target.value); if (ok) setOk(null); }}
                      placeholder="HYRO-XXXX-XXXX-XXXX"
                      disabled={loading || downloading}
                      className="w-full h-14 pl-9 pr-4 rounded-2xl bg-black/40 border border-white/10 text-[15px] font-mono tracking-wider text-white placeholder:text-white/25 focus:outline-none focus:border-[#7A5CFF]/60 focus:bg-black/50 transition-colors disabled:opacity-60"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                    {ok && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          Chave válida{ok.planLabel ? ` - ${ok.planLabel}` : ""}
                          {expiresLabel ? ` - expira em ${expiresLabel}` : ""}.
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={handleClick}
                    disabled={loading || downloading}
                    className="group relative mt-5 w-full h-14 overflow-hidden rounded-2xl bg-gradient-to-b from-[#7A5CFF] to-[#5B3DF5] text-[15px] font-semibold text-white shadow-[0_14px_38px_-14px_rgba(122,92,255,0.9)] transition hover:brightness-110 disabled:opacity-70 inline-flex items-center justify-center gap-2.5"
                  >
                    <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[420%]" />
                    {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Validando chave...</>) :
                     downloading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Preparando download...</>) :
                     (<><DownloadIcon className="h-4 w-4" /> {ok ? "Baixar extensão agora" : "Validar e baixar"}</>)}
                  </button>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-white/45">
                    <span className="inline-flex items-center gap-1.5"><Chrome className="h-3.5 w-3.5" /> Chrome, Edge, Brave, Opera</span>
                    <a href="#como-instalar" className="inline-flex items-center gap-1 text-[#A78BFA] hover:text-white transition">
                      <PlayCircle className="h-3.5 w-3.5" /> Como instalar
                    </a>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <span className="text-[12.5px] text-white/55">Ainda não tem chave?</span>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#4ade80] hover:text-emerald-300 transition">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                    </svg>
                    Falar no WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Install - vertical timeline */}
          <section id="como-instalar" className="mt-16 sm:mt-20 max-w-2xl mx-auto scroll-mt-24">
            <div className="text-center">
              <span className="text-[11.5px] font-mono uppercase tracking-[0.2em] text-[#A78BFA]">Guia rápido</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">Como instalar em 5 passos</h2>
              <p className="mt-2 text-[13.5px] text-white/50">Menos de 1 minuto do zip até a extensão ativa.</p>
            </div>

            <ol className="relative mt-10 space-y-4 pl-1">
              {/* vertical line */}
              <span className="pointer-events-none absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#7A5CFF]/50 via-white/10 to-transparent" aria-hidden="true" />
              {steps.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="relative flex gap-4"
                >
                  <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#7A5CFF]/40 bg-[#0E0A1E] text-[13px] font-bold text-white shadow-[0_0_0_4px_rgba(11,7,21,1)]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3.5 backdrop-blur-sm hover:border-[#7A5CFF]/25 transition-colors">
                    <h3 className="text-[14.5px] font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-1 text-[13px] text-white/55 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.li>
              ))}
            </ol>

            <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-white/40">
              <ShieldCheck className="h-3.5 w-3.5 text-[#A78BFA]" />
              <span>Compatível com todos os navegadores baseados em Chromium.</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
