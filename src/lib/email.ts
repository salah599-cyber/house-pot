import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "House Poker <onboarding@resend.dev>";

  if (!apiKey) {
    return { skipped: true as const };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return { sent: true as const };
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
