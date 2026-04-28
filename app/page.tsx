import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDefaultRoute } from "@/lib/rbac";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(getDefaultRoute(session.role));
}
