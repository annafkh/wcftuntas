import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loginAction } from "@/app/login/actions";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui/primitives";
import { getDefaultRoute } from "@/lib/rbac";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect(getDefaultRoute(session.role));
  }

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-4 py-10 text-slate-900">
      <Image
        src="/bg-wcf-hero.webp"
        alt=""
        fill
        priority
        quality={72}
        sizes="100vw"
        className="absolute inset-0 object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/35" />

      <div className="relative mx-auto flex w-full max-w-xl justify-center">
        <Card className="w-full bg-white/95 p-8 backdrop-blur-sm lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
                Selamat Datang!
              </p>
              <h2 className="text-3xl font-semibold text-slate-950">WCF Tuntas</h2>
              <p className="text-[15px] leading-7 text-slate-700">
                Sistem Monitoring Tugas Karyawan
              </p>
            </div>

            <div className="flex items-center self-start sm:ml-4">
              <div className="overflow-hidden">
                <Image
                  src="/pt-wcf-logo.webp"
                  alt="Logo PT WCF"
                  width={100}
                  height={100}
                  className="h-25 w-25 object-cover"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <LoginForm action={loginAction} />
          </div>
        </Card>
      </div>
    </main>
  );
}
