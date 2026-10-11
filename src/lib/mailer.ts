import { log } from "./logger";
import type { ContactInput } from "./validation";

export type DeliveryResult = { ok: true; mode: "resend" | "log" } | { ok: false; reason: string };

/**
 * Sends the message through Resend when configured, otherwise logs a notice
 * (the message itself is printed only outside production, to help local testing).
 * Body is plain text, so there is no HTML to escape or inject into.
 */
export async function sendContactEmail(input: Pick<ContactInput, "name" | "email" | "message">, requestId: string): Promise<DeliveryResult> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>";

  if (!key || !to) {
    log("warn", "contact.delivery_not_configured", { requestId });
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n--- New message (dev only) ---\nFrom: ${input.name} <${input.email}>\n\n${input.message}\n------------------------------\n`);
    }
    return { ok: true, mode: "log" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: input.email,
        subject: `Portfolio message from ${input.name}`.slice(0, 120),
        text: `${input.message}\n\n-- \n${input.name} <${input.email}>`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      log("error", "contact.resend_failed", { requestId, status: res.status });
      return { ok: false, reason: `provider_${res.status}` };
    }
    return { ok: true, mode: "resend" };
  } catch (err) {
    log("error", "contact.resend_exception", { requestId, name: err instanceof Error ? err.name : "unknown" });
    return { ok: false, reason: "network" };
  }
}
