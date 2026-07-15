import { db } from "@/lib/db";
import {
  emailTemplate,
  sendEmail,
  shouldUseResendForEmail,
  type SendEmailResult,
} from "@/lib/email";
import { notifications } from "@/lib/db/schema";

type NotificationEmailInput = {
  email: string;
  userId: string | null;
  type: (typeof notifications.$inferInsert)["type"];
  title: string;
  body: string;
  link: string;
  emailSubject?: string;
  emailBody?: string;
};

export async function createNotification(input: NotificationEmailInput): Promise<SendEmailResult> {
  await db.insert(notifications).values({
    userId: input.userId,
    email: input.email,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });

  if (!input.email || input.userId) {
    return { status: "skipped", reason: "in_app_only" };
  }

  if (!shouldUseResendForEmail()) {
    return { status: "skipped", reason: "sandbox_sender" };
  }

  return sendEmail({
    to: input.email,
    subject: input.emailSubject ?? input.title,
    html: emailTemplate(
      input.title,
      input.emailBody ?? input.body,
      input.link,
      "Open in House Poker",
    ),
  });
}

type GameInviteNotificationInput = {
  email: string;
  userId: string | null;
  gameTitle: string;
  hostName: string;
  registrationLink: string;
  gameInviteLink: string;
};

export async function sendGameInviteNotifications(input: GameInviteNotificationInput) {
  const title = `You're invited to ${input.gameTitle}`;
  const body = input.userId
    ? `${input.hostName} invited you to a cash game. Confirm your spot before seats fill up.`
    : `${input.hostName} invited you to join House Poker and play in ${input.gameTitle}. Register first, then confirm your seat.`;

  return createNotification({
    email: input.email,
    userId: input.userId,
    type: input.userId ? "game_invite" : "platform_invite",
    title,
    body,
    link: input.userId ? input.gameInviteLink : input.registrationLink,
    emailSubject: title,
    emailBody: body,
  });
}

export async function sendGameStartedNotification(input: {
  email: string;
  userId: string;
  gameTitle: string;
  link: string;
}) {
  await createNotification({
    email: input.email,
    userId: input.userId,
    type: "game_started",
    title: `${input.gameTitle} is now live`,
    body: "The host started the game. Your buy-ins will appear in your private game view.",
    link: input.link,
  });
}

export async function sendGameSettledNotification(input: {
  email: string;
  userId: string;
  gameTitle: string;
  link: string;
}) {
  await createNotification({
    email: input.email,
    userId: input.userId,
    type: "game_settled",
    title: `${input.gameTitle} settled`,
    body: "Review your settlement details and mark payments as settled when done.",
    link: input.link,
    emailSubject: `Settlements ready — ${input.gameTitle}`,
    emailBody:
      "The host finalized the game. Open House Poker to see who you owe or who owes you.",
  });
}

export async function sendGameFullNotification(input: {
  email: string;
  userId: string;
  gameTitle: string;
  link: string;
}) {
  await createNotification({
    email: input.email,
    userId: input.userId,
    type: "game_full",
    title: `${input.gameTitle} is full`,
    body: "All seats are confirmed. You are on the waitlist if you have not confirmed yet.",
    link: input.link,
  });
}

type PlatformInviteNotificationInput = {
  email: string;
  userId: string | null;
  inviterName: string;
  inviteLink: string;
  targetRole: "player" | "host";
};

export async function sendPlatformInviteNotification(input: PlatformInviteNotificationInput) {
  const isHostInvite = input.targetRole === "host";
  const title = isHostInvite
    ? "You're invited to host on House Poker"
    : "You're invited to House Poker";
  const body = isHostInvite
    ? `${input.inviterName} invited you to join House Poker as a host. Register with this email to create and manage cash games.`
    : `${input.inviterName} invited you to join House Poker. Register to confirm game seats and track your buy-ins and settlements.`;

  return createNotification({
    email: input.email,
    userId: input.userId,
    type: "platform_invite",
    title,
    body,
    link: input.inviteLink,
    emailSubject: title,
    emailBody: body,
  });
}
