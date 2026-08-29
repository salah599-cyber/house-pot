export const RESET_PASSWORD_TASK_PATH = "/session-tasks/reset-password";

export function isSessionTaskPath(pathname: string) {
  return pathname === "/session-tasks" || pathname.startsWith("/session-tasks/");
}
