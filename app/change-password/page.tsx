import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getSession } from "@/lib/auth";
import { getDefaultRoute } from "@/lib/rbac";
import { Card } from "@/components/ui/primitives";

export default async function ChangePasswordPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.mustChangePassword) {
    redirect(getDefaultRoute(session.role));
  }

  return (
        <main className="relative flex min-h-screen items-center overflow-hidden px-4 py-10 text-slate-900">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-wcf.png')" }}
      />
      <div className="absolute inset-0 bg-slate-950/35" />

      <div className="relative mx-auto flex w-full max-w-xl justify-center">
        <Card className="w-full bg-white/95 p-8 backdrop-blur-sm lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
                Ubah Password Anda
              </p>
              <h2 className="text-3xl font-semibold text-slate-950">WCF Tuntas</h2>
              <p className="text-[15px] leading-7 text-slate-700">
                Gunakan password baru dengan minimal 8 karakter untuk melanjutkan ke sistem.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <ChangePasswordForm />
          </div>
        </Card>
      </div>
    </main>
  );
}