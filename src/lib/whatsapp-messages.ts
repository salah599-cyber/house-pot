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

export function settlementTransferMessage(input: {
  gameTitle: string;
  payeeName: string;
  formattedAmount: string;
  playerGameLink: string;
}) {
  return [
    `Settlements for ${input.gameTitle}:`,
    `You owe ${input.payeeName} ${input.formattedAmount}.`,
    `View details: ${input.playerGameLink}`,
  ].join("\n");
}

export function playerSettlementSummaryMessage(input: {
  gameTitle: string;
  lines: string[];
  playerGameLink: string;
}) {
  const summary =
    input.lines.length > 0 ? input.lines.join("\n") : "No transfers for you in this game.";

  return [`My settlement for ${input.gameTitle}:`, summary, input.playerGameLink].join("\n");
}
