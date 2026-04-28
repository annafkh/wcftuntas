import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { getApprovalPendingCount, getNotifications } from "@/lib/data";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  const [notifications, approvalPendingCount] = await Promise.all([
    getNotifications(session.userId),
    getApprovalPendingCount(session),
  ]);

  return (
    <AppShell
      session={session}
      notifications={notifications}
      approvalPendingCount={approvalPendingCount}
    >
      {children}
    </AppShell>
  );
}
