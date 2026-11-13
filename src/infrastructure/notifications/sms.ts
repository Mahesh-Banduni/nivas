import { secret } from "@/infrastructure/cloudflare/env";

/** SMS adapter. Plug in MSG91 / Twilio / SNS via the same interface. */
export async function sendSms(input: { to: string; body: string }) {
  const apiKey = secret("SMS_API_KEY");
  if (!apiKey) {
    console.info(`[sms:console] to=${input.to} body="${input.body.slice(0, 90)}"`);
    return { delivered: false, provider: "console" as const };
  }
  const gatewayUrl = secret("SMS_GATEWAY_URL");
  if (!gatewayUrl) throw new Error("SMS_GATEWAY_URL must be configured when SMS_API_KEY is set.");
  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authkey: apiKey },
    body: JSON.stringify({ to: input.to, message: input.body }),
  });
  return { delivered: response.ok, provider: "msg91" as const };
}
