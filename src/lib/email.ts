import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "missing_api_key" }
  | { status: "failed"; reason: string };

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM ?? "House Poker <onboarding@resend.dev>";

  if (!apiKey) {
    return { status: "skipped", reason: "missing_api_key" };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    return { status: "failed", reason: error.message };
  }

  return { status: "sent" };
}

export function emailButton(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#10b981;color:#000;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">${label}</a></p>`;
}

export function emailTemplate(title: string, body: string, actionHref?: string, actionLabel?: string) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#e5e5e5;background:#111">
      <h1 style="color:#fff;font-size:24px">${title}</h1>
      <p style="line-height:1.6;color:#a3a3a3">${body}</p>
      ${actionHref && actionLabel ? emailButton(actionHref, actionLabel) : ""}
      <p style="font-size:12px;color:#737373">House Poker — invite-only home games</p>
    </div>
  `;
}

export function describeEmailDeliveryIssue(result: SendEmailResult) {
  if (result.status === "sent") {
    return null;
  }

  if (result.status === "skipped") {
    return "Email was not sent because RESEND_API_KEY is not configured. Copy the invite link and send it manually.";
  }

  return `Email could not be delivered: ${result.reason}. Copy the invite link and send it manually.`;
}
