import { redirect } from "next/navigation";
import { MasterAreaManager } from "@/components/master-area-manager";
import { Card, PageIntro } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth";
import { listMasterAreas } from "@/lib/data";

export default async function MasterAreasPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  if (session.role !== "pt_wcf") {
    redirect("/dashboard");
  }

  const areas = await listMasterAreas();
  const areaKey = areas.map((area) => `${area.id}:${area.updatedAt}`).join("|");

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <MasterAreaManager key={areaKey} initialAreas={areas} />
      </Card>
    </div>
  );
}
