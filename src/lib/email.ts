import { Resend } from "resend";

import { APP_NAME } from "@/lib/constants";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "missing_api_key" | "sandbox_sender" | "in_app_only" }
  | { status: "failed"; reason: string };

function getEmailFromAddress() {
  return process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`;
}

export function isResendSandboxSender(from = getEmailFromAddress()) {
  return from.includes("onboarding@resend.dev");
}

/** True when Resend can send to arbitrary recipients (verified domain configured). */
export function shouldUseResendForEmail() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return false;
  }

  return !isResendSandboxSender();
}

/** Invite emails work via Clerk without a custom domain; Resend is optional. */
export function isInviteEmailDeliveryConfigured() {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim()) || shouldUseResendForEmail();
}

/** @deprecated Use isInviteEmailDeliveryConfigured for invite flows. */
export function isEmailDeliveryConfigured() {
  return isInviteEmailDeliveryConfigured();
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = getEmailFromAddress();

  if (!apiKey) {
    return { status: "skipped", reason: "missing_api_key" };
  }

  if (isResendSandboxSender(from)) {
    return { status: "skipped", reason: "sandbox_sender" };
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
      <p style="font-size:12px;color:#737373">${APP_NAME} — invite-only home games</p>
    </div>
  `;
}

export function describeEmailDeliveryIssue(result: SendEmailResult) {
  if (result.status === "sent") {
    return null;
  }

  if (result.status === "skipped") {
    if (result.reason === "in_app_only" || result.reason === "sandbox_sender") {
      return null;
    }

    return "Email was not sent because RESEND_API_KEY is not configured. Copy the invite link and send it manually.";
  }

  return `Email could not be delivered: ${result.reason}. Copy the invite link and send it manually.`;
}
