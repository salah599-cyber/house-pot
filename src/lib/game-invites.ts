export function isGameInviteExpired(invite: { expiresAt: Date; status: string }) {
  if (invite.status === "expired" || invite.status === "declined") {
    return true;
  }
  return invite.expiresAt.getTime() < Date.now();
}

export function isGameInviteActive(invite: { expiresAt: Date; status: string }) {
  if (isGameInviteExpired(invite)) {
    return false;
  }
  return invite.status === "pending" || invite.status === "registered" || invite.status === "confirmed";
}
