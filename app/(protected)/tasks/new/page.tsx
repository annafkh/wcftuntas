import { redirect } from "next/navigation";
import { MasterTaskPackageManager } from "@/components/master-task-package-manager";
import { MasterTaskManager } from "@/components/master-task-manager";
import { Card } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth";
import { listMasterAreas, listTaskPackages, listTaskTemplates } from "@/lib/data";

export default async function NewTaskPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  if (session.role !== "pt_wcf") {
    redirect("/dashboard");
  }

  const [areas, taskTemplates, taskPackages] = await Promise.all([
    listMasterAreas(),
    listTaskTemplates(),
    listTaskPackages(),
  ]);
  const taskTemplateKey = taskTemplates.map((taskTemplate) => `${taskTemplate.id}:${taskTemplate.updatedAt}`).join("|");
  const taskPackageKey = taskPackages
    .map((taskPackage) =>
      `${taskPackage.id}:${taskPackage.updatedAt}:${taskPackage.taskTemplates
        .map((taskTemplate) => taskTemplate.id)
        .join(",")}`,
    )
    .join("|");

  return (
    <div className="space-y-6">

      <Card className="p-4 sm:p-6">
        <MasterTaskPackageManager
          key={`${taskPackageKey}-${taskTemplateKey}`}
          initialTaskPackages={taskPackages}
          taskTemplates={taskTemplates}
        />
      </Card>

      <Card className="p-4 sm:p-6">
        <MasterTaskManager key={taskTemplateKey} initialTaskTemplates={taskTemplates} areas={areas} />
      </Card>
    </div>
  );
}
