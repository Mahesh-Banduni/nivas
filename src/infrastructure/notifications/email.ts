import { secret } from "@/infrastructure/cloudflare/env";

/** Email adapter. Resend-compatible; logs to the console when unconfigured. */
export async function sendEmail(input: { to: string; subject: string; html: string; text?: string }) {
  const apiKey = secret("RESEND_API_KEY");
  if (!apiKey) {
    console.info(`[email:console] to=${input.to} subject="${input.subject}"`);
    return { delivered: false, provider: "console" as const };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: secret("EMAIL_FROM", "stays@nivas.example"),
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });
  return { delivered: response.ok, provider: "resend" as const };
}
