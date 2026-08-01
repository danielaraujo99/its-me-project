import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, X, Loader2, CheckCircle2, AlertCircle, Minus, Key, Lock, Mail, Calendar, Download } from "lucide-react";
import { PixIcon } from "./PixIcon";
import { formatBRL } from "@/lib/plans";
import { getPixStatus } from "@/lib/checkout.functions";
import { issueLicense, type IssuedLicense } from "@/lib/hyro-license.functions";
import { clearActiveCharge, updateActiveCharge, saveIssuedLicense, getIssuedLicense } from "@/lib/pix-store";
import { getDeviceInfo, getPublicIp } from "@/lib/device";


type Charge = {
  id: string;
  qrCodeBase64: string | null;
  qrCodeText: string | null;
  expiresAt: string | null;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCpf?: string;
  planId?: string;
  createdAt?: string | number;
};

type Status = "pending" | "paid" | "expired" | "error";

const EXPIRY_MS = 5 * 60 * 1000;




function normalize(s: string): Status {
  const v = s.toLowerCase();
  if (["paid", "approved", "completed", "confirmed"].includes(v)) return "paid";
  if (["expired", "canceled", "cancelled", "failed"].includes(v)) return "expired";
  return "pending";
}

export function PixModal({ charge, onClose, onMinimize }: { charge: Charge; onClose: () => void; onMinimize?: () => void }) {

  const deadline = useMemo(() => {
    const remote = charge.expiresAt ? new Date(charge.expiresAt).getTime() : NaN;
    const fromRemote = Number.isFinite(remote) ? remote : 0;
    const fallback = Date.now() + EXPIRY_MS;
    // Prefer remote when it's within a reasonable window, else fallback to 5 min.
    return fromRemote > Date.now() && fromRemote - Date.now() <= EXPIRY_MS + 60_000 ? fromRemote : fallback;
  }, [charge.expiresAt]);

  const [now, setNow] = useState(Date.now());
  const [status, setStatus] = useState<Status>("pending");
  const [copied, setCopied] = useState(false);
  const [license, setLicense] = useState<IssuedLicense | null>(() => {
    const stored = getIssuedLicense(charge.id);
    return stored ? { licenseKey: stored.licenseKey, password: stored.password, email: stored.email, planLabel: stored.planLabel, expiresAt: stored.expiresAt } : null;
  });
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const issuedRef = useRef(false);
  const pollRef = useRef<number | null>(null);


  const remaining = Math.max(0, deadline - now);
  const totalMs = EXPIRY_MS;
  const progress = Math.max(0, Math.min(1, remaining / totalMs));
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (status !== "pending") return;
    if (remaining <= 0) {
      setStatus("expired");
      clearActiveCharge();
    }
  }, [remaining, status]);

  useEffect(() => {
    if (!charge.id || status !== "pending") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { getUtms } = await import("@/lib/utm-tracker");
        const r = await getPixStatus({ data: {
          id: charge.id,
          order: {
            planId: charge.planId ?? null,
            amountCents: Math.round((charge.amount || 0) * 100),
            createdAt: charge.createdAt ? new Date(charge.createdAt).toISOString() : null,
            customerName: charge.customerName ?? null,
            customerEmail: charge.customerEmail ?? null,
            customerPhone: charge.customerPhone ?? null,
            customerDocument: charge.customerCpf ?? null,
            tracking: getUtms(),
          },
        } });
        if (cancelled) return;
        const s = normalize(r.status || "");
        if (s !== "pending") {
          setStatus(s);
          if (s === "paid") {
            updateActiveCharge({ status: "paid" });
          } else {
            clearActiveCharge();
          }
        }
      } catch { /* silently retry */ }
    };
    pollRef.current = window.setInterval(tick, 4000);
    tick();

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [charge.id, status]);

  // Emit license the instant status turns paid (once).
  const runIssue = () => {
    if (!charge.customerName || !charge.customerEmail || !charge.planId) {
      setLicenseError("Dados do comprador ausentes para emitir a licença.");
      return;
    }
    issuedRef.current = true;
    setIssuing(true);
    setLicenseError(null);
    import("@/lib/utm-tracker").then(({ getUtms }) => {
      const tracking = getUtms();
      const orderCreatedAt = charge.createdAt ? new Date(charge.createdAt).toISOString() : undefined;
      return issueLicense({ data: {
        planId: charge.planId!,
        paymentId: charge.id,
        customerName: charge.customerName!,
        customerEmail: charge.customerEmail!,
        customerPhone: charge.customerPhone,
        customerCpf: charge.customerCpf,
        provider: "pix",
        tracking,
        orderCreatedAt,
      }});
    })
      .then(async (l) => {
        setLicense(l);
        const dev = getDeviceInfo();
        const ip = await getPublicIp();
        saveIssuedLicense({
          paymentId: charge.id,
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
        clearActiveCharge();
      })

      .catch((e) => {
        issuedRef.current = false;
        setLicenseError(e instanceof Error ? e.message : "Falha ao emitir licença");
      })
      .finally(() => setIssuing(false));
  };

  useEffect(() => {
    if (status !== "paid") return;
    if (license || issuedRef.current) return;
    runIssue();
     
  }, [status, license, charge]);



  const minimize = onMinimize ?? onClose;

  const closeAndDiscard = () => {
    clearActiveCharge();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") minimize(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [minimize]);


  const copy = async () => {
    if (!charge.qrCodeText) return;
    try {
      await navigator.clipboard.writeText(charge.qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] grid place-items-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
        onClick={minimize}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#120C24]/95 backdrop-blur-xl shadow-[0_30px_100px_-30px_rgba(91,61,245,0.6)] overflow-hidden max-h-[92vh] overflow-y-auto no-scrollbar"
        >
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            {status === "pending" && (
              <button
                onClick={minimize}
                aria-label="Minimizar"
                title="Minimizar (o Pix continua ativo)"
                className="h-9 w-9 grid place-items-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={status === "pending" ? minimize : closeAndDiscard}
              aria-label="Fechar"
              className="h-9 w-9 grid place-items-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 pr-20">
              <div className="h-11 w-11 rounded-2xl bg-white grid place-items-center shrink-0">
                <PixIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-wider text-white/50 uppercase">Pagamento via Pix</div>
                <div className="text-lg font-black tracking-tight">{formatBRL(charge.amount)}</div>
              </div>
            </div>

            {status === "paid" ? (
              <SuccessState amount={charge.amount} license={license} issuing={issuing} error={licenseError} onRetry={runIssue} onClose={closeAndDiscard} />



            ) : status === "expired" ? (
              <ExpiredState onClose={closeAndDiscard} />
            ) : (

              <>
                {/* Timer */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
                    <span>Tempo restante</span>
                    <span className="font-mono text-white tabular-nums">{mm}:{ss}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7A5CFF] to-[#5B3DF5] transition-[width] duration-300 ease-linear"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>

                {/* QR */}
                <div className="mt-5 flex justify-center">
                  <div className="rounded-2xl bg-white p-4 shadow-[0_10px_40px_-15px_rgba(122,92,255,0.35)] ring-1 ring-white/10">
                    {charge.qrCodeBase64 ? (
                      <img
                        src={charge.qrCodeBase64.startsWith("data:") ? charge.qrCodeBase64 : `data:image/png;base64,${charge.qrCodeBase64}`}
                        alt="QR Code PIX"
                        width={200}
                        height={200}
                        className="h-[200px] w-[200px] block object-contain"
                      />
                    ) : (
                      <div className="h-[200px] w-[200px] grid place-items-center text-black/60 text-xs">
                        QR indisponível
                      </div>
                    )}
                  </div>
                </div>



                <p className="mt-4 text-[12.5px] text-white/60 text-center leading-relaxed">
                  Abra o app do seu banco, escaneie o QR Code ou use o código Pix copia e cola abaixo.
                </p>

                {/* Copy paste */}
                <div className="mt-3">
                  <div className="text-[10px] font-bold tracking-wider text-white/40 uppercase mb-1.5">Pix copia e cola</div>
                  <div className="flex items-stretch gap-2">
                    <input
                      readOnly
                      value={charge.qrCodeText || ""}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 h-11 rounded-xl bg-white/[0.03] border border-white/10 px-3 text-[12px] font-mono text-white/85 truncate outline-none focus:border-[#7A5CFF]/50"
                    />
                    <button
                      onClick={copy}
                      disabled={!charge.qrCodeText}
                      className="shrink-0 h-11 px-3 rounded-xl bg-[#5B3DF5]/90 hover:bg-[#5B3DF5] border border-white/10 text-white text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {copied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-center gap-2 text-[11.5px] text-white/50">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A78BFA]" />
                  Aguardando confirmação do pagamento...
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SuccessState({ amount, license, issuing, error, onRetry, onClose }: { amount: number; license: IssuedLicense | null; issuing: boolean; error: string | null; onRetry: () => void; onClose: () => void }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyValue = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(key);
      setTimeout(() => setCopiedField((k) => (k === key ? null : k)), 1500);
    } catch { /* ignore */ }
  };
  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };
  return (
    <div className="mt-6">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-full grid place-items-center bg-emerald-500/15 border border-emerald-400/30">
          <CheckCircle2 className="h-7 w-7 text-emerald-300" />
        </div>
        <h3 className="mt-4 text-xl font-black">Pagamento confirmado</h3>
        <p className="mt-1.5 text-[13px] text-white/60">Recebemos {formatBRL(amount)}. Sua licença foi emitida.</p>
      </div>

      {issuing && !license && (
        <div className="mt-6 flex items-center justify-center gap-2 text-[12.5px] text-white/60">
          <Loader2 className="h-4 w-4 animate-spin text-[#A78BFA]" /> Gerando sua licença...
        </div>
      )}

      {error && !license && (
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200 text-center">
            {error}
          </div>
          <button
            onClick={onRetry}
            disabled={issuing}
            className="w-full h-11 rounded-xl bg-[#5B3DF5]/90 hover:bg-[#5B3DF5] border border-white/10 text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {issuing ? <><Loader2 className="h-4 w-4 animate-spin" /> Emitindo...</> : <>Tentar novamente</>}
          </button>
        </div>
      )}

      {license && (
        <div className="mt-5 space-y-2.5">
          <CredRow icon={Key} label="Chave da licença" value={license.licenseKey} mono onCopy={copyValue} copied={copiedField === "key"} field="key" />
          <CredRow icon={Lock} label="Senha" value={license.password} mono onCopy={copyValue} copied={copiedField === "pass"} field="pass" />
          <CredRow icon={Mail} label="E-mail cadastrado" value={license.email} onCopy={copyValue} copied={copiedField === "email"} field="email" />
          <CredRow icon={Calendar} label="Válida até" value={fmtDate(license.expiresAt)} onCopy={copyValue} copied={copiedField === "exp"} field="exp" />

          <div className="pt-2 grid grid-cols-2 gap-2">
            <a
              href="https://chromewebstore.google.com/"
              target="_blank"
              rel="noreferrer"
              className="h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" /> Baixar extensão
            </a>
            <button
              onClick={onClose}
              className="h-11 rounded-xl bg-[#5B3DF5]/90 hover:bg-[#5B3DF5] border border-white/10 text-white text-[12.5px] font-semibold"
            >
              Concluir
            </button>
          </div>
          <p className="pt-1 text-center text-[11px] text-white/45">Guarde essas credenciais em local seguro. Elas também foram enviadas para seu e-mail.</p>
        </div>
      )}
    </div>
  );
}

function CredRow({ icon: Icon, label, value, mono, onCopy, copied, field }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean; onCopy: (f: string, v: string) => void; copied: boolean; field: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 flex items-center gap-3">
      <span className="h-8 w-8 shrink-0 rounded-lg grid place-items-center bg-[#5B3DF5]/15 border border-[#7A5CFF]/30">
        <Icon className="h-4 w-4 text-[#A78BFA]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold tracking-wider text-white/45 uppercase">{label}</div>
        <div className={`truncate text-[13px] text-white ${mono ? "font-mono tracking-wide" : ""}`}>{value}</div>
      </div>
      <button
        onClick={() => onCopy(field, value)}
        className="shrink-0 h-8 w-8 grid place-items-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors"
        aria-label={`Copiar ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}


function ExpiredState({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-6 text-center py-4">
      <div className="mx-auto h-14 w-14 rounded-full grid place-items-center bg-white/[0.04] border border-white/10">
        <AlertCircle className="h-7 w-7 text-[#A78BFA]" />
      </div>
      <h3 className="mt-4 text-xl font-black">Pix expirado</h3>
      <p className="mt-2 text-[13px] text-white/60">
        O tempo para pagamento acabou. Gere um novo Pix para continuar.
      </p>
      <button
        onClick={onClose}
        className="mt-6 h-11 px-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[13px] font-semibold"
      >
        Fechar
      </button>
    </div>
  );
}
