import { redirect } from "next/navigation";
import { PartnerTable } from "@/components/partner-table";
import { Card, PageIntro } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth";
import { listPartners } from "@/lib/data";

export default async function PartnersPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  if (session.role !== "pt_wcf") {
    redirect("/dashboard");
  }

  const partners = await listPartners();

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
              Tabel Master Mitra
            </p>
            <h4 className="mt-2 text-2xl font-semibold text-slate-950">Daftar Master Mitra</h4>
            <p className="mt-2 text-[15px] text-slate-700">
              Kelola daftar mitra yang nanti dipakai pada form pengguna.
            </p>
          </div>
        </div>
        <PartnerTable initialPartners={partners} />
      </Card>
    </div>
  );
}
