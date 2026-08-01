import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import type { UtmifyTracking } from "./utmify.server";

function onlyDigits(v: string) { return (v || "").replace(/\D+/g, ""); }
function validCPF(cpf: string) {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: number) => {
    let sum = 0;
    for (let i = 0; i < base; i++) sum += parseInt(d[i]) * (base + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}

export type CreateCardPaymentInput = {
  planId: string;
  token: string;
  paymentMethodId: string;
  issuerId?: string | null;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
  customerPhone?: string;
  tracking?: UtmifyTracking | null;
};

export type CreateCardPaymentResult = {
  id: string;
  status: string;              // approved | in_process | rejected | ...
  statusDetail: string;
  amount: number;
};

export const createCardPayment = createServerFn({ method: "POST" })
  .inputValidator((data: CreateCardPaymentInput) => {
    if (!data || typeof data !== "object") throw new Error("Payload inválido");
    if (!data.planId) throw new Error("Plano obrigatório");
    if (!data.token) throw new Error("Token do cartão ausente");
    if (!data.paymentMethodId) throw new Error("Bandeira não identificada");
    if (!data.customerName || data.customerName.trim().length < 3) throw new Error("Nome inválido");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail || "")) throw new Error("E-mail inválido");
    if (!validCPF(data.customerDocument || "")) throw new Error("CPF inválido");
    return data;
  })
  .handler(async ({ data }): Promise<CreateCardPaymentResult> => {
    const { createCardPaymentServer } = await import("./mercadopago.server");
    const { getPlanById } = await import("./plans");
    const res = await createCardPaymentServer(data);

    const plan = getPlanById(data.planId);
    const createdAt = new Date().toISOString();
    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const userAgent = getRequestHeader("user-agent") ?? null;
    const amountCents = Math.round(res.amount * 100);

    // Persist payment attempt in the Hyro DB (fields exactly as typed).
    try {
      const { logPaymentEvent } = await import("./hyro-payments-log.server");
      await logPaymentEvent({
        gatewayId: res.id,
        provider: "card",
        status: res.status,
        planId: data.planId,
        planLabel: plan ? `${plan.duration} - ${plan.hours}` : null,
        amountCents,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone ?? null,
        customerCpf: data.customerDocument,
        gatewayStatusDetail: res.statusDetail || null,
        tracking: data.tracking ?? null,
        ip,
        userAgent,
        utmifyCreatedAt: createdAt,
      });
    } catch (e) {
      console.error("[hyro-log:card-created]", e);
    }

    // Utmify: cobrança gerada e, quando for o caso, aprovada/recusada.
    const { dispatchUtmify } = await import("./utmify-dispatch.server");
    const base = {
      orderId: res.id,
      paymentMethod: "credit_card" as const,
      createdAt,
      planId: data.planId,
      amountCents,
      customer: {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone ?? null,
        document: data.customerDocument,
        ip,
      },
      tracking: data.tracking ?? null,
    };
    const st = (res.status || "").toLowerCase();
    await dispatchUtmify({ ...base, status: "waiting_payment" });
    if (st === "approved" || st === "authorized") {
      await dispatchUtmify({ ...base, status: "paid", approvedAt: new Date().toISOString() });
    } else if (st === "rejected" || st === "cancelled" || st === "canceled") {
      await dispatchUtmify({ ...base, status: "refused" });
    }

    return res;
  });

export const getCardPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("ID obrigatório");
    return data;
  })
  .handler(async ({ data }) => {
    const { getCardPaymentStatusServer } = await import("./mercadopago.server");
    const res = await getCardPaymentStatusServer(data.id);
    try {
      const { updatePaymentStatus } = await import("./hyro-payments-log.server");
      await updatePaymentStatus(data.id, res.status, res.statusDetail || null);
    } catch { /* ignore */ }

    const n = (res.status || "").toLowerCase();
    const { dispatchUtmifyFromDb } = await import("./utmify-dispatch.server");
    if (n === "approved" || n === "authorized") {
      await dispatchUtmifyFromDb(data.id, "paid", new Date().toISOString());
    } else if (n === "rejected" || n === "cancelled" || n === "canceled") {
      await dispatchUtmifyFromDb(data.id, "refused");
    }
    return res;
  });

