import { SuperAdminNav } from "@/components/admin/super-admin-nav";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Super admin</h1>
        <p className="text-muted-foreground">Platform management and audit.</p>
      </div>
      <SuperAdminNav />
      {children}
    </div>
  );
}
