// Central dispatcher for Utmify order events (server-only).
// Guarantees: same orderId + same createdAt across statuses, idempotent sends,
// real customer IP, and never throws into the checkout flow.
import { getHyroDb, getHyroDbConfig } from "./hyro-db.server";
import { sendUtmifyOrder, type UtmifyTracking } from "./utmify.server";
import { getPlanById } from "./plans";

export type DispatchStatus = "waiting_payment" | "paid" | "refused";

export type DispatchInput = {
  orderId: string;
  status: DispatchStatus;
  paymentMethod: "pix" | "credit_card";
  createdAt: string;                 // ISO — must be the order creation time
  approvedAt?: string | null;        // ISO — only when paid
  planId: string;
  amountCents: number;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
    document?: string | null;
    ip?: string | null;
  };
  tracking?: UtmifyTracking | null;
};

const FLAG: Record<DispatchStatus, string> = {
  waiting_payment: "utmify_waiting_sent",
  paid: "utmify_paid_sent",
  refused: "utmify_refused_sent",
};

const onlyDigits = (v?: string | null) => (v || "").replace(/\D+/g, "");

function productName(planId: string): string {
  const plan = getPlanById(planId);
  return plan ? `Love Hyro ${plan.duration}` : "Love Hyro";
}

async function readRow(orderId: string) {
  if (!getHyroDbConfig().configured) return null;
  try {
    const db = getHyroDb();
    const { data, error } = await db
      .from("hyro_payment_events")
      .select("*")
      .eq("gateway_id", orderId)
      .maybeSingle();
    if (error) return null;
    return (data ?? null) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

async function markSent(orderId: string, status: DispatchStatus) {
  if (!getHyroDbConfig().configured) return;
  try {
    const db = getHyroDb();
    await db
      .from("hyro_payment_events")
      .update({ [FLAG[status]]: true, updated_at: new Date().toISOString() })
      .eq("gateway_id", orderId);
  } catch (e) {
    console.error("[utmify:mark]", e instanceof Error ? e.message : String(e));
  }
}

/** Sends one Utmify order event. Skips it when the same status already went out. */
export async function dispatchUtmify(input: DispatchInput): Promise<void> {
  try {
    const row = await readRow(input.orderId);
    if (row && row[FLAG[input.status]] === true) return;

    // Always reuse the original creation timestamp when we have one stored.
    const storedCreated = row?.["utmify_created_at"];
    const createdAt =
      typeof storedCreated === "string" && !Number.isNaN(new Date(storedCreated).getTime())
        ? new Date(storedCreated).toISOString()
        : input.createdAt;

    const total = Math.max(0, Math.round(input.amountCents));
    const res = await sendUtmifyOrder({
      orderId: input.orderId,
      paymentMethod: input.paymentMethod,
      status: input.status,
      createdAt,
      approvedAt: input.status === "paid" ? (input.approvedAt ?? new Date().toISOString()) : null,
      customer: {
        name: input.customer.name.trim(),
        email: input.customer.email.trim().toLowerCase(),
        phone: onlyDigits(input.customer.phone) || null,
        document: onlyDigits(input.customer.document) || null,
        ip: input.customer.ip ?? null,
      },
      product: { id: input.planId, name: productName(input.planId), priceInCents: total },
      totalPriceInCents: total,
      gatewayFeeInCents: 0,
      tracking: input.tracking ?? null,
    });

    if (res.ok) await markSent(input.orderId, input.status);
  } catch (e) {
    console.error("[utmify:dispatch]", e instanceof Error ? e.message : String(e));
  }
}

/**
 * Sends an event rebuilding the whole order from the payment log
 * (used by status polling, where the browser sends only the payment id).
 */
export async function dispatchUtmifyFromDb(
  orderId: string,
  status: DispatchStatus,
  approvedAt?: string | null,
): Promise<void> {
  try {
    const row = await readRow(orderId);
    if (!row) return;
    if (row[FLAG[status]] === true) return;

    const email = String(row["customer_email"] ?? "");
    const name = String(row["customer_name"] ?? "");
    if (!email || !name) return;

    const created = row["utmify_created_at"] ?? row["created_at"];
    const createdAt =
      typeof created === "string" && !Number.isNaN(new Date(created).getTime())
        ? new Date(created).toISOString()
        : new Date().toISOString();

    await dispatchUtmify({
      orderId,
      status,
      paymentMethod: row["provider"] === "card" ? "credit_card" : "pix",
      createdAt,
      approvedAt: approvedAt ?? null,
      planId: String(row["plan_id"] ?? ""),
      amountCents: Number(row["amount_cents"] ?? 0),
      customer: {
        name,
        email,
        phone: (row["customer_phone"] as string | null) ?? null,
        document: (row["customer_cpf"] as string | null) ?? null,
        ip: (row["ip"] as string | null) ?? null,
      },
      tracking: {
        src: (row["src"] as string | null) ?? null,
        sck: (row["sck"] as string | null) ?? null,
        utm_source: (row["utm_source"] as string | null) ?? null,
        utm_campaign: (row["utm_campaign"] as string | null) ?? null,
        utm_medium: (row["utm_medium"] as string | null) ?? null,
        utm_content: (row["utm_content"] as string | null) ?? null,
        utm_term: (row["utm_term"] as string | null) ?? null,
      },
    });
  } catch (e) {
    console.error("[utmify:dispatch-db]", e instanceof Error ? e.message : String(e));
  }
}
