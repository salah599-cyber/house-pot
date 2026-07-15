import { db } from "@/lib/db";
import { emailTemplate, sendEmail } from "@/lib/email";
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

export async function createNotification(input: NotificationEmailInput) {
  await db.insert(notifications).values({
    userId: input.userId,
    email: input.email,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });

  if (input.email) {
    await sendEmail({
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

  await createNotification({
    email: input.email,
    userId: input.userId,
    type: input.userId ? "game_invite" : "platform_invite",
    title,
    body,
    link: input.userId ? input.gameInviteLink : input.registrationLink,
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
