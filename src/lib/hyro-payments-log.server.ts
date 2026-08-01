// Server-only logger for every payment attempt (PIX and Card).
// Records exactly the fields the customer typed on checkout, plus gateway metadata.
// Never throws to the caller: logging must never break the checkout flow.

export type PaymentProvider = "pix" | "card";

export type PaymentLogInput = {
  gatewayId: string;                 // vexopay PIX id or Mercado Pago payment id
  provider: PaymentProvider;
  status: string;                    // pending | waiting_payment | paid | approved | rejected | expired | ...
  planId: string;
  planLabel?: string | null;
  amountCents: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCpf?: string | null;
  gatewayStatusDetail?: string | null;
  tracking?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    src?: string | null;
    sck?: string | null;
  } | null;
  ip?: string | null;
  userAgent?: string | null;
  utmifyCreatedAt?: string | null;   // ISO — fixed order creation time sent to Utmify
};

const onlyDigits = (v?: string | null) => (v || "").replace(/\D+/g, "");

export async function logPaymentEvent(input: PaymentLogInput): Promise<void> {
  try {
    const { getHyroDb, getHyroDbConfig } = await import("./hyro-db.server");
    if (!getHyroDbConfig().configured) return;
    const db = getHyroDb();

    const row = {
      gateway_id: input.gatewayId,
      provider: input.provider,
      status: input.status,
      plan_id: input.planId,
      plan_label: input.planLabel ?? null,
      amount_cents: input.amountCents,
      customer_name: input.customerName?.trim() || null,
      customer_email: (input.customerEmail || "").trim().toLowerCase() || null,
      customer_phone: onlyDigits(input.customerPhone) || null,
      customer_cpf: onlyDigits(input.customerCpf) || null,
      gateway_status_detail: input.gatewayStatusDetail ?? null,
      utm_source: input.tracking?.utm_source ?? null,
      utm_medium: input.tracking?.utm_medium ?? null,
      utm_campaign: input.tracking?.utm_campaign ?? null,
      utm_content: input.tracking?.utm_content ?? null,
      utm_term: input.tracking?.utm_term ?? null,
      src: input.tracking?.src ?? null,
      sck: input.tracking?.sck ?? null,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      created_source: "site-vendas",
      utmify_created_at: input.utmifyCreatedAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await db
      .from("hyro_payment_events")
      .upsert(row, { onConflict: "gateway_id" });
    if (error) console.error("[hyro-payments-log:upsert]", error.message);
  } catch (e) {
    console.error("[hyro-payments-log]", e);
  }
}

export async function updatePaymentStatus(gatewayId: string, status: string, statusDetail?: string | null): Promise<void> {
  try {
    const { getHyroDb, getHyroDbConfig } = await import("./hyro-db.server");
    if (!getHyroDbConfig().configured) return;
    const db = getHyroDb();
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (statusDetail !== undefined) patch.gateway_status_detail = statusDetail;
    const { error } = await db
      .from("hyro_payment_events")
      .update(patch)
      .eq("gateway_id", gatewayId);
    if (error) console.error("[hyro-payments-log:update]", error.message);
  } catch (e) {
    console.error("[hyro-payments-log:update]", e);
  }
}
