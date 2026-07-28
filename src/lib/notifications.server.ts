import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function setupVapid() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export function adminSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: { title: string; body: string; url: string },
): Promise<void> {
  await webpush.sendNotification(
    { endpoint, keys: { p256dh, auth } },
    JSON.stringify(payload),
  );
}

export async function sendWhatsApp(phone: string, billName: string, amount: number): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const to = phone.replace(/\s+/g, "").replace(/^00/, "+");

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME ?? "mensagenspagamento",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "pt_PT" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: billName },
              { type: "text", text: amount.toFixed(2) },
            ],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${err}`);
  }
}

export async function runBillNotifications(): Promise<{ sent: number; errors: string[] }> {
  setupVapid();
  const db = adminSupabase();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDate();

  const { data: settings } = await db
    .from("user_settings")
    .select("user_id, phone, notify_push, notify_whatsapp, currency")
    .or("notify_push.eq.true,notify_whatsapp.eq.true");

  if (!settings || settings.length === 0) {
    return { sent: 0, errors: [] };
  }

  let sent = 0;
  const errors: string[] = [];

  for (const setting of settings) {
    const { data: bills } = await db
      .from("bill_templates")
      .select("name, amount")
      .eq("user_id", setting.user_id)
      .eq("due_day", tomorrowDay)
      .eq("is_active", true);

    if (!bills || bills.length === 0) continue;

    for (const bill of bills) {
      const currency = (setting.currency ?? "EUR") as string;
      const currencySymbols: Record<string, string> = { EUR: "€", BRL: "R$", USD: "$", GBP: "£" };
      const symbol = currencySymbols[currency] ?? "€";
      const amountFmt = `${bill.amount.toFixed(2)} ${symbol}`;

      if (setting.notify_push) {
        const { data: subs } = await db
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", setting.user_id);

        for (const sub of subs ?? []) {
          try {
            await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
              title: `💳 ${bill.name} vence amanhã`,
              body: `Valor: ${amountFmt}`,
              url: "/",
            });
            sent++;
          } catch (e) {
            errors.push(`Push: ${String(e).slice(0, 80)}`);
          }
        }
      }

      if (setting.notify_whatsapp && setting.phone) {
        try {
          await sendWhatsApp(setting.phone, bill.name, bill.amount);
          sent++;
        } catch (e) {
          errors.push(`WhatsApp: ${String(e).slice(0, 80)}`);
        }
      }
    }
  }

  return { sent, errors };
}
