import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { getPlanById } from "./plans";
import type { UtmifyTracking } from "./utmify.server";

function onlyDigits(v: string) { return v.replace(/\D+/g, ""); }
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

export type CreatePixInput = {
  planId: string;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
  customerPhone?: string;
  tracking?: UtmifyTracking | null;
};

export const createPixCharge = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePixInput) => {
    if (!data || typeof data !== "object") throw new Error("Payload inválido");
    if (!data.planId) throw new Error("Plano obrigatório");
    if (!data.customerName || data.customerName.trim().length < 3) throw new Error("Nome inválido");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail || "")) throw new Error("E-mail inválido");
    if (!validCPF(data.customerDocument || "")) throw new Error("CPF inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const plan = getPlanById(data.planId);
    if (!plan) throw new Error("Plano não encontrado");
    const amountCents = Math.round(plan.price * 100);
    if (amountCents < 100) throw new Error("Valor mínimo R$ 1,00");

    const { createPix } = await import("./vexopay.server");
    const charge = await createPix({
      amountCents,
      description: `Love Hyro ${plan.duration}`.slice(0, 80),
      customerName: data.customerName.trim(),
      customerDocument: data.customerDocument.replace(/\D/g, ""),
    });

    const createdAt = new Date().toISOString();
    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const userAgent = getRequestHeader("user-agent") ?? null;
    const orderId = charge.id;

    // 1) Persist the attempt first so every later event can rebuild the order.
    try {
      const { logPaymentEvent } = await import("./hyro-payments-log.server");
      await logPaymentEvent({
        gatewayId: orderId,
        provider: "pix",
        status: "pending",
        planId: plan.id,
        planLabel: `${plan.duration} - ${plan.hours}`,
        amountCents,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone ?? null,
        customerCpf: data.customerDocument,
        tracking: data.tracking ?? null,
        ip,
        userAgent,
        utmifyCreatedAt: createdAt,
      });
    } catch (e) {
      console.error("[hyro-log:pix-created]", e);
    }

    // 2) Utmify: PIX gerado (waiting_payment).
    const { dispatchUtmify } = await import("./utmify-dispatch.server");
    await dispatchUtmify({
      orderId,
      status: "waiting_payment",
      paymentMethod: "pix",
      createdAt,
      planId: plan.id,
      amountCents,
      customer: {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone ?? null,
        document: data.customerDocument,
        ip,
      },
      tracking: data.tracking ?? null,
    });

    return { ...charge, amount: plan.price, createdAt };
  });


export const getPixStatus = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("ID obrigatório");
    return data;
  })
  .handler(async ({ data }) => {
    const { checkPixStatus } = await import("./vexopay.server");
    const status = await checkPixStatus(data.id);
    try {
      const { updatePaymentStatus } = await import("./hyro-payments-log.server");
      await updatePaymentStatus(data.id, status);
    } catch { /* ignore */ }

    // Utmify: confirma a venda no servidor, independente do navegador do cliente.
    const n = (status || "").toLowerCase();
    if (["paid", "approved", "completed", "confirmed"].includes(n)) {
      const { dispatchUtmifyFromDb } = await import("./utmify-dispatch.server");
      await dispatchUtmifyFromDb(data.id, "paid", new Date().toISOString());
    } else if (["expired", "canceled", "cancelled", "refused", "failed"].includes(n)) {
      const { dispatchUtmifyFromDb } = await import("./utmify-dispatch.server");
      await dispatchUtmifyFromDb(data.id, "refused");
    }
    return { status };
  });

