export type UserRole = "pt_wcf" | "karyawan" | "pengawas";
export type TaskType = "harian" | "mingguan" | "bulanan";
export type TaskStatus =
  | "draft"
  | "ditugaskan"
  | "selesai_karyawan"
  | "menunggu_review_pengawas"
  | "disetujui_pengawas"
  | "selesai"
  | "ditolak_revisi";

export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  mustChangePassword: boolean;
  isActive: boolean;
  role: UserRole;
  partnerId: string | null;
  department: string;
  createdAt: string;
};

export type Partner = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type MasterArea = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  areaId: string | null;
  title: string;
  description: string;
  type: TaskType;
  assignedBy: string;
  assignedTo: string;
  shift: ShiftType;
  taskTemplateId: string | null;
  shiftScheduleId: string | null;
  supervisorId: string | null;
  dueDate: string;
  taskDate: string;
  status: TaskStatus;
  employeeChecklistAt: string | null;
  supervisorApprovedAt: string | null;
  supervisorNote: string | null;
  createdAt: string;
  updatedAt: string;
  area: MasterArea | null;
};

export type Attachment = {
  id: string;
  taskId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  taskId: string;
  actorId: string;
  action: string;
  note: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string;
  readAt: string | null;
};

export type SessionPayload = {
  userId: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  partnerId?: string | null;
  department?: string;
  mustChangePassword: boolean;
  impersonatorId?: string;
  impersonatorName?: string;
  impersonatorRole?: UserRole;
  impersonatorDepartment?: string;
};

export type ShiftType = "pagi" | "middle" | "siang" | "mingguan" | "bulanan";

export type ShiftSchedule = {
  id: string;
  date: string;
  shift: ShiftType;
  employeeId: string;
  note: string | null;
  updatedAt: string;
  taskTemplates: TaskTemplate[];
};

export type TaskTemplate = {
  id: string;
  areaId: string | null;
  title: string;
  description: string;
  type: TaskType;
  createdAt: string;
  updatedAt: string;
  area: MasterArea | null;
};

export type TaskPackage = {
  id: string;
  name: string;
  description: string;
  taskTemplates: TaskTemplate[];
  createdAt: string;
  updatedAt: string;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  pt_wcf: "Monitoring Tugas",
  karyawan: "Karyawan",
  pengawas: "Pengawas",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  pagi: "Pagi",
  middle: "Middle",
  siang: "Siang",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

export const SHIFT_COLOR_CLASSES: Record<ShiftType, string> = {
  pagi: "border-amber-200 bg-amber-50 text-amber-700",
  middle: "border-slate-200 bg-slate-100 text-slate-700",
  siang: "border-sky-200 bg-sky-50 text-sky-700",
  mingguan: "border-emerald-200 bg-emerald-50 text-emerald-700",
  bulanan: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
};

export const SHIFT_CALENDAR_COLORS: Record<
  ShiftType,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  pagi: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
    textColor: "#92400e",
  },
  middle: {
    backgroundColor: "#e2e8f0",
    borderColor: "#64748b",
    textColor: "#334155",
  },
  siang: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0ea5e9",
    textColor: "#075985",
  },
  mingguan: {
    backgroundColor: "#d1fae5",
    borderColor: "#10b981",
    textColor: "#065f46",
  },
  bulanan: {
    backgroundColor: "#fae8ff",
    borderColor: "#c026d3",
    textColor: "#86198f",
  },
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  draft: "Draft",
  ditugaskan: "Ditugaskan",
  selesai_karyawan: "Menunggu Persetujuan Pengawas",
  menunggu_review_pengawas: "Menunggu Persetujuan Pengawas(Revisi)",
  disetujui_pengawas: "Disetujui Pengawas",
  selesai: "Selesai",
  ditolak_revisi: "Belum Sesuai",
};
