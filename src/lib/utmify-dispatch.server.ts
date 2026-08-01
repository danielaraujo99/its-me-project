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

export type DispatchFallback = {
  planId?: string | null;
  amountCents?: number | null;
  provider?: "pix" | "card" | null;
  createdAt?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerDocument?: string | null;
  tracking?: UtmifyTracking | null;
};

/**
 * Sends an event rebuilding the whole order from the payment log
 * (used by status polling, where the browser sends only the payment id).
 * When the log row is missing (DB offline / row never written) it falls back
 * to the snapshot the caller provides, so `paid` is never lost.
 */
export async function dispatchUtmifyFromDb(
  orderId: string,
  status: DispatchStatus,
  approvedAt?: string | null,
  fallback?: DispatchFallback | null,
): Promise<void> {
  try {
    const row = await readRow(orderId);
    if (row && row[FLAG[status]] === true) return;

    const pick = (col: string, fb?: string | null) => {
      const v = row?.[col];
      const s = typeof v === "string" ? v.trim() : "";
      return s || (fb ?? "").trim();
    };

    const email = pick("customer_email", fallback?.customerEmail);
    const name = pick("customer_name", fallback?.customerName);
    if (!email || !name) return;

    const planId = pick("plan_id", fallback?.planId);
    const amountCents =
      Number(row?.["amount_cents"] ?? 0) || Number(fallback?.amountCents ?? 0);
    if (!planId || amountCents <= 0) return;

    const provider = (row?.["provider"] as string | undefined) ?? fallback?.provider ?? "pix";
    const created = row?.["utmify_created_at"] ?? row?.["created_at"] ?? fallback?.createdAt;
    const createdAt =
      typeof created === "string" && !Number.isNaN(new Date(created).getTime())
        ? new Date(created).toISOString()
        : new Date().toISOString();

    const trackFrom = (col: string, fb?: string | null) => {
      const v = row?.[col];
      const s = typeof v === "string" ? v.trim() : "";
      return s || (fb ?? null);
    };

    await dispatchUtmify({
      orderId,
      status,
      paymentMethod: provider === "card" ? "credit_card" : "pix",
      createdAt,
      approvedAt: approvedAt ?? null,
      planId,
      amountCents,
      customer: {
        name,
        email,
        phone: pick("customer_phone", fallback?.customerPhone) || null,
        document: pick("customer_cpf", fallback?.customerDocument) || null,
        ip: (row?.["ip"] as string | null) ?? null,
      },
      tracking: {
        src: trackFrom("src", fallback?.tracking?.src),
        sck: trackFrom("sck", fallback?.tracking?.sck),
        utm_source: trackFrom("utm_source", fallback?.tracking?.utm_source),
        utm_campaign: trackFrom("utm_campaign", fallback?.tracking?.utm_campaign),
        utm_medium: trackFrom("utm_medium", fallback?.tracking?.utm_medium),
        utm_content: trackFrom("utm_content", fallback?.tracking?.utm_content),
        utm_term: trackFrom("utm_term", fallback?.tracking?.utm_term),
      },
    });
  } catch (e) {
    console.error("[utmify:dispatch-db]", e instanceof Error ? e.message : String(e));
  }
}

