import { createServerFn } from "@tanstack/react-start";
import { getPlanById } from "./plans";
import { generateLicenseKey, generateLicensePassword, computeExpiresAt } from "./license";
import type { UtmifyTracking } from "./utmify.server";

export type IssuedLicense = {
  licenseKey: string;
  password: string;
  email: string;
  planLabel: string;
  expiresAt: string; // ISO
};

export type IssueLicenseInput = {
  planId: string;
  paymentId: string;
  provider?: "pix" | "card";
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCpf?: string;
  tracking?: UtmifyTracking | null;
  orderCreatedAt?: string; // ISO — should match the createdAt sent on waiting_payment
};

const onlyDigits = (v: string) => (v || "").replace(/\D+/g, "");

export const issueLicense = createServerFn({ method: "POST" })
  .inputValidator((data: IssueLicenseInput) => {
    if (!data?.planId) throw new Error("planId obrigatório");
    if (!data?.paymentId) throw new Error("paymentId obrigatório");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data?.customerEmail || "")) throw new Error("E-mail inválido");
    if (!data?.customerName || data.customerName.trim().length < 2) throw new Error("Nome inválido");
    return data;
  })
  .handler(async ({ data }): Promise<IssuedLicense> => {
    const plan = getPlanById(data.planId);
    if (!plan) throw new Error("Plano não encontrado");

    // Rigid payment verification before issuing anything.
    const provider = data.provider ?? "pix";
    let normalized: string;
    if (provider === "card") {
      const { getCardPaymentStatusServer } = await import("./mercadopago.server");
      const { status } = await getCardPaymentStatusServer(data.paymentId);
      normalized = status.toLowerCase();
    } else {
      const { checkPixStatus } = await import("./vexopay.server");
      normalized = (await checkPixStatus(data.paymentId)).toLowerCase();
    }
    const isPaid = ["paid", "approved", "completed", "confirmed"].includes(normalized);
    if (!isPaid) throw new Error(`Pagamento não confirmado (status: ${normalized})`);

    const { getHyroDb } = await import("./hyro-db.server");
    const db = getHyroDb();
    const email = data.customerEmail.trim().toLowerCase();
    const planLabel = `${plan.duration} - ${plan.hours}`;
    const cpf = onlyDigits(data.customerCpf || "");
    const phone = onlyDigits(data.customerPhone || "");

    // Idempotency: if a license was already emitted for this exact payment,
    // return it instead of creating a duplicate.
    const { data: byPayment } = await db
      .from("hyro_extension_licenses")
      .select("id,customer_email,password,expires_at,plan_label")
      .eq("payment_id", data.paymentId)
      .eq("created_source", "site-vendas")
      .maybeSingle();

    if (byPayment && byPayment.id) {
      return {
        licenseKey: String(byPayment.id),
        password: String(byPayment.password ?? ""),
        email: String(byPayment.customer_email ?? email),
        planLabel: String(byPayment.plan_label ?? planLabel),
        expiresAt: new Date(byPayment.expires_at).toISOString(),
      };
    }

    const licenseKey = generateLicenseKey();
    const password = generateLicensePassword();
    const expiresAt = computeExpiresAt(plan.hours);

    // Ensure a user exists in hyro_extension_users (FK requirement).
    // Reuse by email; otherwise create a lightweight "cliente" record.
    let userId: string;
    const { data: existingUser } = await db
      .from("hyro_extension_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingUser?.id) {
      userId = String(existingUser.id);
    } else {
      userId = crypto.randomUUID();
      const { error: userErr } = await db.from("hyro_extension_users").insert({
        id: userId,
        email,
        name: data.customerName.trim(),
        role: "cliente",
        active: true,
        password_hash: password,
        whatsapp: phone || null,
      });
      if (userErr) throw new Error(`Não foi possível registrar o usuário: ${userErr.message}`);
    }

    const row = {
      id: licenseKey,
      user_id: userId,
      status: "ativa" as const,
      plan: plan.id,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      created_source: "site-vendas",
      plan_label: planLabel,
      password,
      customer_name: data.customerName.trim(),
      customer_email: email,
      customer_phone: phone || null,
      customer_cpf: cpf || null,
      payment_id: data.paymentId,
    };



    const { error } = await db.from("hyro_extension_licenses").insert(row);
    if (error) throw new Error(`Não foi possível emitir a licença: ${error.message}`);

    // Utmify: rede de seguranca idempotente (o envio principal ocorre no polling do servidor).
    try {
      const { dispatchUtmify } = await import("./utmify-dispatch.server");
      const amountCents = Math.round(plan.price * 100);
      const nowIso = new Date().toISOString();
      const createdAt = data.orderCreatedAt && !Number.isNaN(new Date(data.orderCreatedAt).getTime())
        ? new Date(data.orderCreatedAt).toISOString()
        : nowIso;
      await dispatchUtmify({
        orderId: data.paymentId,
        status: "paid",
        paymentMethod: provider === "card" ? "credit_card" : "pix",
        createdAt,
        approvedAt: nowIso,
        planId: plan.id,
        amountCents,
        customer: { name: data.customerName, email, phone: phone || null, document: cpf || null },
        tracking: data.tracking ?? null,
      });
    } catch (e) {
      console.error("[utmify:paid]", e);
    }

    return {
      licenseKey,
      password,
      email,
      planLabel,
      expiresAt: expiresAt.toISOString(),
    };
  });

export type RecoveredLicense = {
  licenseKey: string;
  password: string;
  email: string;
  planLabel: string;
  expiresAt: string;
  createdAt: string;
};

async function queryLicenses(filter: { column: "customer_email" | "customer_cpf"; value: string }): Promise<RecoveredLicense[]> {
  const { getHyroDb } = await import("./hyro-db.server");
  const db = getHyroDb();
  const { data: rows, error } = await db
    .from("hyro_extension_licenses")
    .select("id,customer_email,password,expires_at,plan_label,created_at")
    .eq(filter.column, filter.value)
    .eq("created_source", "site-vendas")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Falha ao consultar: ${error.message}`);
  return (rows ?? []).map((r) => ({
    licenseKey: String(r.id),
    password: String(r.password ?? ""),
    email: String(r.customer_email ?? ""),
    planLabel: String(r.plan_label ?? ""),
    expiresAt: new Date(r.expires_at).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

// Recover by e-mail (kept for backward compatibility).
export const recoverLicensesByEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data?.email || "")) throw new Error("E-mail inválido");
    return { email: data.email.trim().toLowerCase() };
  })
  .handler(async ({ data }): Promise<RecoveredLicense[]> => {
    return queryLicenses({ column: "customer_email", value: data.email });
  });

// Recover by CPF: more precise since a buyer's CPF is unique per person.
export const recoverLicensesByCpf = createServerFn({ method: "POST" })
  .inputValidator((data: { cpf: string }) => {
    const digits = (data?.cpf || "").replace(/\D+/g, "");
    if (digits.length !== 11) throw new Error("CPF inválido");
    return { cpf: digits };
  })
  .handler(async ({ data }): Promise<RecoveredLicense[]> => {
    return queryLicenses({ column: "customer_cpf", value: data.cpf });
  });
