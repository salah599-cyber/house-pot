export function platformInviteMessage(input: {
  inviterName: string;
  email: string;
  inviteLink: string;
}) {
  return [
    `You're invited to House Poker by ${input.inviterName}.`,
    `Register with ${input.email} here: ${input.inviteLink}`,
  ].join("\n");
}

export function gameInviteUnregisteredMessage(input: {
  hostName: string;
  gameTitle: string;
  registrationLink: string;
}) {
  return [
    `${input.hostName} invited you to ${input.gameTitle}.`,
    `Register first, then confirm your seat: ${input.registrationLink}`,
  ].join("\n");
}

export function gameInviteRegisteredMessage(input: {
  hostName: string;
  gameTitle: string;
  gameInviteLink: string;
}) {
  return [
    `${input.hostName} invited you to ${input.gameTitle}.`,
    `Confirm your seat: ${input.gameInviteLink}`,
  ].join("\n");
}

import { formatSettlementAmount, formatSettlementDate } from "@/lib/dates";

type SettlementLineInput = {
  fromName: string;
  toName: string;
  amount: string | number;
};

export function formatSettlementLine({ fromName, toName, amount }: SettlementLineInput) {
  return `${fromName} → ${toName}: ${formatSettlementAmount(amount)}`;
}

export function buildSettlementWhatsAppMessage(input: {
  date: Date | string;
  lines: SettlementLineInput[];
}) {
  const dateLabel = formatSettlementDate(input.date);
  const transferLines = input.lines.map((line) => formatSettlementLine(line));

  return [dateLabel, ...transferLines].join("\n");
}
