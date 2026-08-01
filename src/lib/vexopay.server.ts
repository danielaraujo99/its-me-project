const BASE = process.env.VEXOPAY_BASE_URL || "https://www.vexopay.com.br";

function pick<T = unknown>(obj: unknown, keys: string[]): T | null {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if (v != null && v !== "") return v as T;
  }
  return null;
}

// Human readable messages for the documented VexoPay error codes.
function statusMessage(status: number): string | null {
  switch (status) {
    case 400: return "Dados do pagamento inválidos ou incompletos";
    case 401: return "Credenciais do gateway inválidas";
    case 403: return "Conta do gateway suspensa ou IP bloqueado";
    case 404: return "Recurso não encontrado no gateway";
    case 409: return "Conflito de estado na cobrança";
    case 428: return "Reautenticação obrigatória no gateway (PIN)";
    case 429: return "Muitas tentativas. Aguarde alguns segundos e tente de novo";
    case 500: return "Erro interno do gateway";
    case 502: return "O processador de pagamento está instável no momento. Tente novamente em instantes";
    default: return null;
  }
}

async function vexoOnce(path: string, init: RequestInit = {}) {
  const ci = process.env.VEXOPAY_CLIENT_ID;
  const cs = process.env.VEXOPAY_CLIENT_SECRET;
  if (!ci || !cs) throw new Error("VexoPay credentials not configured");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Cache-Control": "no-cache",
      ci,
      cs,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { status: res.status, json: json as Record<string, unknown> | null, text };
}

// 502/500/429 are transient processor errors - retry with a short backoff
// before surfacing the failure to the customer.
async function vexo(path: string, init: RequestInit = {}) {
  const transient = new Set([429, 500, 502, 503, 504]);
  let last = await vexoOnce(path, init);
  for (let attempt = 1; attempt <= 2 && transient.has(last.status); attempt++) {
    await new Promise((r) => setTimeout(r, attempt * 900));
    last = await vexoOnce(path, init);
  }
  return last;
}

export type PixCharge = {
  id: string;
  qrCodeBase64: string | null;
  qrCodeText: string | null;
  expiresAt: string | null;
  status: string | null;
};

export async function createPix(input: {
  amountCents: number;
  description: string;
  customerName: string;
  customerDocument: string;
}): Promise<PixCharge> {
  const body = {
    amount: Number((input.amountCents / 100).toFixed(2)),
    payerName: input.customerName.slice(0, 120),
    payerDocument: input.customerDocument.replace(/\D/g, ""),
    description: input.description.slice(0, 80),
  };

  const r = await vexo("/api/gateway/pix-create", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (r.status < 200 || r.status >= 300 || (r.json && (r.json as { success?: boolean }).success === false)) {
    const msg = pick<string>(r.json, ["error", "message", "detail"]) || r.text || `Falha ao criar PIX`;
    console.error("[vexopay:create]", r.status, r.text?.slice(0, 500));
    throw new Error(`${msg} (HTTP ${r.status})`);
  }


  const inner = (r.json && ((r.json as { data?: unknown }).data ?? (r.json as { result?: unknown }).result)) || r.json || {};
  return {
    id: String(pick(inner, ["transactionId", "transaction_id", "id"]) ?? ""),
    qrCodeBase64: pick<string>(inner, ["qrCodeBase64", "qr_code_base64"]),
    qrCodeText: pick<string>(inner, ["copyPaste", "copy_paste", "qrCode", "qr_code", "brcode", "emv"]),
    expiresAt: pick<string>(inner, ["expiresAt", "expires_at", "expiration"]),
    status: pick<string>(inner, ["status", "state"]),
  };
}

export async function checkPixStatus(id: string): Promise<string> {
  const r = await vexo(`/api/gateway/pix-status?transactionId=${encodeURIComponent(id)}`, { method: "GET" });
  if (r.status < 200 || r.status >= 300) throw new Error("Falha ao consultar status");
  const inner = (r.json && ((r.json as { data?: unknown }).data ?? (r.json as { result?: unknown }).result)) || r.json || {};
  return String(pick<string>(inner, ["status", "state"]) ?? "unknown").toLowerCase();
}
