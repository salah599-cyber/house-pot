type FormFeedbackProps = {
  type: "success" | "warning" | "error";
  message: string;
  inviteLink?: string;
};

const styles = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  error: "border-red-500/30 bg-red-500/10 text-red-200",
};

export function FormFeedback({ type, message, inviteLink }: FormFeedbackProps) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${styles[type]}`}>
      <p>{message}</p>
      {inviteLink ? (
        <p className="mt-2 break-all text-xs opacity-90">{inviteLink}</p>
      ) : null}
    </div>
  );
}
