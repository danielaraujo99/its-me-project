import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2, AlertCircle, Copy, Check, Key, Lock, Mail, Calendar, Download, CreditCard } from "lucide-react";
import { formatBRL } from "@/lib/plans";
import { issueLicense, type IssuedLicense } from "@/lib/hyro-license.functions";
import { saveIssuedLicense, getIssuedLicense } from "@/lib/pix-store";
import { getDeviceInfo, getPublicIp } from "@/lib/device";
import extensionAsset from "@/assets/love-hyro-extension-v2.zip.asset.json";

type Buyer = {
  planId: string;
  paymentId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCpf?: string;
};

export function CardResultModal({
  buyer,
  amount,
  status,
  statusDetail,
  onClose,
}: {
  buyer: Buyer;
  amount: number;
  status: string;                 // approved | in_process | rejected | ...
  statusDetail?: string;
  onClose: () => void;
}) {
  const approved = status === "approved";
  const rejected = status === "rejected" || status === "cancelled";
  const [license, setLicense] = useState<IssuedLicense | null>(() => {
    const s = getIssuedLicense(buyer.paymentId);
    return s ? { licenseKey: s.licenseKey, password: s.password, email: s.email, planLabel: s.planLabel, expiresAt: s.expiresAt } : null;
  });
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const issuedRef = useRef(false);

  const runIssue = () => {
    if (issuedRef.current || license) return;
    issuedRef.current = true;
    setIssuing(true);
    setError(null);
    import("@/lib/utm-tracker").then(({ getUtms }) => {
      const tracking = getUtms();
      return issueLicense({ data: { ...buyer, provider: "card", tracking } });
    })
      .then(async (l) => {
        setLicense(l);
        const dev = getDeviceInfo();
        const ip = await getPublicIp();
        saveIssuedLicense({
          paymentId: buyer.paymentId,
          licenseKey: l.licenseKey,
          password: l.password,
          email: l.email,
          planLabel: l.planLabel,
          expiresAt: l.expiresAt,
          issuedAt: Date.now(),
          deviceId: dev.id,
          fingerprint: dev.fingerprint,
          ip,
        });
      })
      .catch((e) => {
        issuedRef.current = false;
        setError(e instanceof Error ? e.message : "Falha ao emitir licença");
      })
      .finally(() => setIssuing(false));
  };

  useEffect(() => {
    if (approved && !license) runIssue();
     
  }, [approved]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] grid place-items-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#120C24]/95 backdrop-blur-xl shadow-[0_30px_100px_-30px_rgba(91,61,245,0.6)] overflow-hidden max-h-[92vh] overflow-y-auto no-scrollbar"
        >
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 z-10 h-9 w-9 grid place-items-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 pr-16">
              <div className="h-11 w-11 rounded-2xl bg-white/[0.05] border border-white/10 grid place-items-center shrink-0">
                <CreditCard className="h-5 w-5 text-[#A78BFA]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-wider text-white/50 uppercase">Pagamento no cartão</div>
                <div className="text-lg font-black tracking-tight">{formatBRL(amount)}</div>
              </div>
            </div>

            {approved ? (
              <div className="mt-6">
                <div className="text-center">
                  <div className="mx-auto h-14 w-14 rounded-full grid place-items-center bg-emerald-500/15 border border-emerald-400/30">
                    <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                  </div>
                  <h3 className="mt-4 text-xl font-black">Pagamento aprovado</h3>
                  <p className="mt-1.5 text-[13px] text-white/60">Recebemos {formatBRL(amount)}. Sua licença foi emitida.</p>
                </div>

                {issuing && !license && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-[12.5px] text-white/60">
                    <Loader2 className="h-4 w-4 animate-spin text-[#A78BFA]" /> Gerando sua licença...
                  </div>
                )}

                {error && !license && (
                  <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200 text-center">{error}</div>
                    <button
                      onClick={runIssue}
                      disabled={issuing}
                      className="w-full h-11 rounded-xl bg-[#5B3DF5]/90 hover:bg-[#5B3DF5] border border-white/10 text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                      {issuing ? <><Loader2 className="h-4 w-4 animate-spin" /> Emitindo...</> : <>Tentar novamente</>}
                    </button>
                  </div>
                )}

                {license && <LicenseBlock license={license} onClose={onClose} />}
              </div>
            ) : rejected ? (
              <div className="mt-6 text-center py-4">
                <div className="mx-auto h-14 w-14 rounded-full grid place-items-center bg-red-500/15 border border-red-400/30">
                  <AlertCircle className="h-7 w-7 text-red-300" />
                </div>
                <h3 className="mt-4 text-xl font-black">Pagamento recusado</h3>
                <p className="mt-2 text-[13px] text-white/60">{statusDetail || "Verifique os dados do cartão ou tente outro."}</p>
                <button
                  onClick={onClose}
                  className="mt-6 w-full h-11 rounded-xl bg-[#5B3DF5]/90 hover:bg-[#5B3DF5] border border-white/10 text-white text-[12.5px] font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="mt-6 text-center py-4">
                <div className="mx-auto h-14 w-14 rounded-full grid place-items-center bg-amber-400/15 border border-amber-300/30">
                  <Loader2 className="h-7 w-7 text-amber-300 animate-spin" />
                </div>
                <h3 className="mt-4 text-xl font-black">Pagamento em análise</h3>
                <p className="mt-2 text-[13px] text-white/60">Seu cartão está sendo revisado. Assim que for aprovado, sua licença será liberada automaticamente.</p>
                <button
                  onClick={onClose}
                  className="mt-6 w-full h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[12.5px] font-semibold"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function LicenseBlock({ license, onClose }: { license: IssuedLicense; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, v: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(key); setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500); } catch { /* ignore */ }
  };
  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
  };
  return (
    <div className="mt-5 space-y-2.5">
      <Row icon={Key} label="Chave da licença" value={license.licenseKey} mono onCopy={copy} copied={copied === "key"} field="key" />
      <Row icon={Lock} label="Senha" value={license.password} mono onCopy={copy} copied={copied === "pass"} field="pass" />
      <Row icon={Mail} label="E-mail cadastrado" value={license.email} onCopy={copy} copied={copied === "email"} field="email" />
      <Row icon={Calendar} label="Válida até" value={fmt(license.expiresAt)} onCopy={copy} copied={copied === "exp"} field="exp" />
      <div className="pt-2 grid grid-cols-2 gap-2">
        <a href={extensionAsset.url} download="love-hyro-extension.zip" rel="noopener" className="h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 transition-colors">
          <Download className="h-4 w-4" /> Baixar extensão
        </a>
        <button onClick={onClose} className="h-11 rounded-xl bg-[#5B3DF5]/90 hover:bg-[#5B3DF5] border border-white/10 text-white text-[12.5px] font-semibold">Concluir</button>
      </div>
      <p className="pt-1 text-center text-[11px] text-white/45">Guarde essas credenciais em local seguro. Elas também foram enviadas para seu e-mail.</p>
    </div>
  );
}

function Row({ icon: Icon, label, value, mono, onCopy, copied, field }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean; onCopy: (f: string, v: string) => void; copied: boolean; field: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 flex items-center gap-3">
      <span className="h-8 w-8 shrink-0 rounded-lg grid place-items-center bg-[#5B3DF5]/15 border border-[#7A5CFF]/30">
        <Icon className="h-4 w-4 text-[#A78BFA]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold tracking-wider text-white/45 uppercase">{label}</div>
        <div className={`truncate text-[13px] text-white ${mono ? "font-mono tracking-wide" : ""}`}>{value}</div>
      </div>
      <button onClick={() => onCopy(field, value)} className="shrink-0 h-8 w-8 grid place-items-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors" aria-label={`Copiar ${label}`}>
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
