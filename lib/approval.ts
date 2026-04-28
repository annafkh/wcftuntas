import { STATUS_LABELS, type ShiftType, type TaskStatus, type TaskType } from "@/lib/types";

export type ApprovalTab = {
  id: string;
  label: string;
  type?: TaskType;
  shift?: ShiftType;
};

export const approvalTabs: ApprovalTab[] = [
  { id: "all", label: "All Tugas" },
  { id: "daily-pagi", label: "Shift Pagi", type: "harian", shift: "pagi" },
  { id: "daily-middle", label: "Shift Middle", type: "harian", shift: "middle" },
  { id: "daily-siang", label: "Shift Siang", type: "harian", shift: "siang" },
  { id: "weekly", label: "Tugas Mingguan", type: "mingguan" },
  { id: "monthly", label: "Tugas Bulanan", type: "bulanan" },
];

type ApprovalTaskBase = {
  title: string;
  description: string;
  taskDate: string;
  status: TaskStatus;
  type: TaskType;
  shift: ShiftType;
  employeeChecklistAt: string | null;
  supervisorApprovedAt: string | null;
  supervisorNote: string | null;
  area: {
    name: string;
  } | null;
  assignedToUser: {
    name: string;
  };
  supervisorUser: {
    name: string;
  } | null;
};

export function matchesApprovalTab(task: { type: TaskType; shift: ShiftType }, tab: ApprovalTab) {
  if (!tab.type) {
    return true;
  }

  if (task.type !== tab.type) {
    return false;
  }

  return tab.shift ? task.shift === tab.shift : true;
}

export function filterApprovalTasks<T extends ApprovalTaskBase>(
  tasks: T[],
  filters: {
    tabId?: string;
    query?: string;
    status?: string;
    date?: string;
  },
) {
  const activeTab = approvalTabs.find((tab) => tab.id === filters.tabId) ?? approvalTabs[0];
  const query = filters.query?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "";
  const date = filters.date ?? "";

  return {
    activeTab,
    tasks: tasks.filter((task) => {
      if (!matchesApprovalTab(task, activeTab)) {
        return false;
      }

      const matchesQuery = query
        ? [
            task.title,
            task.description,
            task.assignedToUser.name,
            task.supervisorUser?.name ?? "",
            task.area?.name ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;
      const matchesStatus = status ? task.status === status : true;
      const matchesDate = date ? task.taskDate.slice(0, 10) === date : true;

      return matchesQuery && matchesStatus && matchesDate;
    }),
  };
}

export function getEmployeeChecklistLabel(task: Pick<ApprovalTaskBase, "employeeChecklistAt">) {
  return task.employeeChecklistAt ? "Sudah" : "Belum";
}

export function getSupervisorChecklistLabel(
  task: Pick<ApprovalTaskBase, "supervisorApprovedAt" | "supervisorUser" | "status">,
) {
  if (task.supervisorApprovedAt || task.supervisorUser) {
    return "Sudah";
  }

  return task.status === "menunggu_review_pengawas" ? "Diproses" : "Belum";
}

export function getApprovalStatusLabel(status: TaskStatus) {
  return STATUS_LABELS[status];
}
