import { hashSync } from "bcryptjs";
import {
  Prisma,
  type ActivityLog as PrismaActivityLog,
  type Attachment as PrismaAttachment,
  type MasterArea as PrismaMasterArea,
  type Notification as PrismaNotification,
  type Partner as PrismaPartner,
  type ShiftSchedule as PrismaShiftSchedule,
  type Task as PrismaTask,
  type TaskPackage as PrismaTaskPackage,
  type TaskTemplate as PrismaTaskTemplate,
  type User as PrismaUser,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { removeStoredFile, storeAttachment, type AttachmentInput } from "@/lib/storage";
import {
  SHIFT_CALENDAR_COLORS,
  SHIFT_LABELS,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
  type MasterArea,
  type Partner,
  type SessionPayload,
  type ShiftType,
  type TaskStatus,
  type TaskType,
  type UserRole,
} from "@/lib/types";

type PrismaWithTaskTemplateDelegate = typeof prisma & {
  taskTemplate?: {
    findMany: typeof prisma.task.findMany;
    findUnique?: unknown;
    create?: unknown;
    update?: unknown;
    delete?: unknown;
    count?: unknown;
  };
};

type TaskFilters = {
  search?: string;
  status?: string;
  type?: string;
  assignedTo?: string;
  date?: string;
  shift?: string;
  partnerId?: string;
};

type ShiftFilters = {
  date?: string;
  employeeId?: string;
  shift?: string;
};

type UserFilters = {
  search?: string;
  role?: UserRole;
  partnerId?: string;
};

type PaginationInput = {
  page?: number;
  perPage?: number;
};

const taskInclude = {
  area: true,
  assignedBy: true,
  assignedTo: true,
  supervisor: true,
  attachments: {
    orderBy: {
      createdAt: "desc",
    },
  },
  activityLogs: {
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
} satisfies Prisma.TaskInclude;

const shiftInclude = {
  employee: true,
  taskTemplates: {
    include: {
      taskTemplate: true,
    },
    orderBy: {
      taskTemplate: {
        title: "asc",
      },
    },
  },
} satisfies Prisma.ShiftScheduleInclude;

const taskPackageInclude = {
  taskTemplates: {
    include: {
      taskTemplate: true,
    },
    orderBy: {
      taskTemplate: {
        title: "asc",
      },
    },
  },
} satisfies Prisma.TaskPackageInclude;

const dashboardTaskSelect = {
  id: true,
  areaId: true,
  title: true,
  description: true,
  type: true,
  assignedToId: true,
  shift: true,
  dueDate: true,
  taskDate: true,
  status: true,
  supervisorNote: true,
  createdAt: true,
  updatedAt: true,
  area: true,
  assignedTo: {
    select: {
      id: true,
      name: true,
      partnerId: true,
      department: true,
    },
  },
  supervisor: {
    select: {
      id: true,
      name: true,
      partnerId: true,
      department: true,
    },
  },
} satisfies Prisma.TaskSelect;

const shiftCalendarInclude = {
  employee: {
    select: {
      id: true,
      name: true,
    },
  },
  tasks: {
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      supervisorNote: true,
      area: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      attachments: {
        select: {
          id: true,
          fileUrl: true,
          fileName: true,
          fileType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      supervisor: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ taskDate: "desc" }, { createdAt: "desc" }],
  },
} satisfies Prisma.ShiftScheduleInclude;

const taskCalendarApiSelect = {
  id: true,
  title: true,
  taskDate: true,
  dueDate: true,
  status: true,
  assignedTo: {
    select: {
      name: true,
    },
  },
  supervisor: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.TaskSelect;

function startOfDay(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return date;
}

function endOfDay(value: string) {
  const date = startOfDay(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function toIso(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Format tanggal tidak valid.");
  }

  return date;
}

function endOfShiftDay(value: string) {
  const date = startOfDay(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function mapUser(user: PrismaUser) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email ?? "",
    passwordHash: user.password,
    mustChangePassword: user.mustChangePassword,
    isActive: user.isActive,
    role: user.role,
    partnerId: user.partnerId,
    department: user.department ?? "-",
    createdAt: user.createdAt.toISOString(),
  };
}

function mapPartner(partner: PrismaPartner): Partner {
  return {
    id: partner.id,
    name: partner.name,
    description: partner.description ?? "",
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}

function mapMasterArea(area: PrismaMasterArea): MasterArea {
  return {
    id: area.id,
    name: area.name,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  };
}

function mapAttachment(attachment: PrismaAttachment) {
  return {
    id: attachment.id,
    taskId: attachment.taskId,
    fileUrl: attachment.fileUrl,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    uploadedBy: attachment.uploadedById,
    createdAt: attachment.createdAt.toISOString(),
  };
}

function mapActivityLog(activity: PrismaActivityLog & { actor?: PrismaUser | null; task?: PrismaTask | null }) {
  return {
    id: activity.id,
    taskId: activity.taskId,
    actorId: activity.actorId,
    action: activity.action,
    note: activity.note,
    createdAt: activity.createdAt.toISOString(),
    actor: activity.actor ? mapUser(activity.actor) : null,
    task: activity.task
      ? {
          id: activity.task.id,
          title: activity.task.title,
        }
      : null,
  };
}

function mapNotification(notification: PrismaNotification) {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    description: notification.description,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}

function mapTaskTemplate(taskTemplate: PrismaTaskTemplate & { area?: PrismaMasterArea | null }) {
  return {
    id: taskTemplate.id,
    areaId: taskTemplate.areaId ?? null,
    title: taskTemplate.title,
    description: taskTemplate.description,
    type: taskTemplate.type,
    createdAt: taskTemplate.createdAt.toISOString(),
    updatedAt: taskTemplate.updatedAt.toISOString(),
    area: taskTemplate.area ? mapMasterArea(taskTemplate.area) : null,
  };
}

function mapTaskPackage(
  taskPackage: PrismaTaskPackage & {
    taskTemplates: Array<{ taskTemplate: PrismaTaskTemplate }>;
  },
) {
  return {
    id: taskPackage.id,
    name: taskPackage.name,
    description: taskPackage.description ?? "",
    taskTemplates: taskPackage.taskTemplates.map((item) => mapTaskTemplate(item.taskTemplate)),
    createdAt: taskPackage.createdAt.toISOString(),
    updatedAt: taskPackage.updatedAt.toISOString(),
  };
}

function mapShift(
  schedule: PrismaShiftSchedule & {
    employee: PrismaUser;
    taskTemplates: Array<{ taskTemplate: PrismaTaskTemplate }>;
  },
) {
  return {
    id: schedule.id,
    date: schedule.date.toISOString().slice(0, 10),
    shift: schedule.shift,
    employeeId: schedule.employeeId,
    note: schedule.note,
    updatedAt: schedule.updatedAt.toISOString(),
    taskTemplates: schedule.taskTemplates.map((item) => mapTaskTemplate(item.taskTemplate)),
    employee: mapUser(schedule.employee),
  };
}

function mapTask(
  task: PrismaTask & {
    area: PrismaMasterArea | null;
    assignedBy: PrismaUser;
    assignedTo: PrismaUser;
    supervisor: PrismaUser | null;
    attachments: PrismaAttachment[];
    activityLogs: (PrismaActivityLog & { actor: PrismaUser })[];
  },
) {
  return {
    id: task.id,
    areaId: task.areaId,
    title: task.title,
    description: task.description ?? "",
    type: task.type,
    assignedBy: task.assignedById,
    assignedTo: task.assignedToId,
    shift: task.shift,
    taskTemplateId: task.taskTemplateId,
    shiftScheduleId: task.shiftScheduleId,
    supervisorId: task.supervisorId,
    dueDate: task.dueDate.toISOString(),
    taskDate: task.taskDate.toISOString(),
    status: task.status,
    employeeChecklistAt: task.employeeChecklistAt?.toISOString() ?? null,
    supervisorApprovedAt: task.supervisorApprovedAt?.toISOString() ?? null,
    supervisorNote: task.supervisorNote,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    area: task.area ? mapMasterArea(task.area) : null,
    assignedByUser: mapUser(task.assignedBy),
    assignedToUser: mapUser(task.assignedTo),
    supervisorUser: task.supervisor ? mapUser(task.supervisor) : null,
    attachments: task.attachments.map(mapAttachment),
    activityLogs: task.activityLogs.map((item) => mapActivityLog({ ...item, actor: item.actor })),
  };
}

function mapTaskSummaryTask(
  task: Prisma.TaskGetPayload<{
    select: typeof dashboardTaskSelect;
  }>,
) {
  return {
    id: task.id,
    areaId: task.areaId,
    title: task.title,
    description: task.description ?? "",
    type: task.type,
    assignedTo: task.assignedToId,
    shift: task.shift,
    dueDate: task.dueDate.toISOString(),
    taskDate: task.taskDate.toISOString(),
    status: task.status,
    supervisorNote: task.supervisorNote,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    area: task.area ? mapMasterArea(task.area) : null,
    assignedToUser: {
      id: task.assignedTo.id,
      name: task.assignedTo.name,
      partnerId: task.assignedTo.partnerId,
      department: task.assignedTo.department ?? "-",
    },
    supervisorUser: task.supervisor
      ? {
          id: task.supervisor.id,
          name: task.supervisor.name,
          partnerId: task.supervisor.partnerId,
          department: task.supervisor.department ?? "-",
        }
      : null,
  };
}

function buildTaskWhere(session: SessionPayload, filters: TaskFilters = {}): Prisma.TaskWhereInput {
  return {
    AND: [
      taskScope(session),
      filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              { description: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {},
      filters.status ? { status: filters.status as TaskStatus } : {},
      filters.type ? { type: filters.type as TaskType } : {},
      filters.assignedTo ? { assignedToId: filters.assignedTo } : {},
      filters.partnerId
        ? {
            assignedTo: {
              partnerId: filters.partnerId,
            },
          }
        : {},
      filters.date
        ? {
            taskDate: {
              gte: startOfDay(filters.date),
              lt: endOfDay(filters.date),
            },
          }
        : {},
      filters.shift ? { shift: filters.shift as ShiftType } : {},
    ],
  };
}

function taskScope(session: SessionPayload): Prisma.TaskWhereInput {
  switch (session.role) {
    case "karyawan":
      return { assignedToId: session.userId };
    case "pengawas":
      return session.partnerId
        ? {
            assignedTo: {
              partnerId: session.partnerId,
            },
          }
        : { assignedToId: "__never__" };
    default:
      return {};
  }
}

function shiftScope(session: SessionPayload): Prisma.ShiftScheduleWhereInput {
  switch (session.role) {
    case "karyawan":
      return { employeeId: session.userId };
    case "pengawas":
      return session.partnerId
        ? {
            employee: {
              partnerId: session.partnerId,
            },
          }
        : { employeeId: "__never__" };
    default:
      return {};
  }
}

async function getSupervisorUserIds(
  partnerId?: string | null,
  tx: Prisma.TransactionClient = prisma,
) {
  const supervisors = await tx.user.findMany({
    where: {
      role: "pengawas",
      ...(partnerId ? { partnerId } : {}),
    },
    select: { id: true },
  });

  return supervisors.map((supervisor) => supervisor.id);
}

async function createTaskAuditLog(tx: Prisma.TransactionClient, input: {
  taskId: string;
  actorId: string;
  action: string;
  note: string;
}) {
  try {
    await tx.activityLog.create({
      data: input,
    });
  } catch (error) {
    if (!shouldRetryTransactionSideEffect(error)) {
      throw error;
    }

    await prisma.activityLog.create({
      data: input,
    });
  }
}

async function createNotifications(tx: Prisma.TransactionClient, notifications: Array<{
  userId: string;
  title: string;
  description: string;
}>) {
  if (notifications.length === 0) {
    return;
  }

  try {
    await tx.notification.createMany({
      data: notifications,
    });
  } catch (error) {
    if (!shouldRetryTransactionSideEffect(error)) {
      throw error;
    }

    await prisma.notification.createMany({
      data: notifications,
    });
  }
}

function shouldRetryTransactionSideEffect(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2028";
  }

  return error instanceof Error && error.message.includes("Transaction not found");
}

async function assertTaskTemplatesExist(
  taskTemplateIds: string[],
  tx: Prisma.TransactionClient = prisma,
) {
  const uniqueIds = [...new Set(taskTemplateIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const templates = await tx.taskTemplate.findMany({
    where: { id: { in: uniqueIds } },
    orderBy: { title: "asc" },
  });

  if (templates.length !== uniqueIds.length) {
    throw new Error("Master task yang dipilih tidak valid.");
  }

  return templates;
}

async function assertMasterAreaExists(areaId: string, tx: Prisma.TransactionClient = prisma) {
  const area = await tx.masterArea.findUnique({
    where: { id: areaId },
  });

  if (!area) {
    throw new Error("Area yang dipilih tidak valid.");
  }

  return area;
}

async function createTasksFromTemplates(
  tx: Prisma.TransactionClient,
  input: {
    taskTemplates: PrismaTaskTemplate[];
    assignedById: string;
    assignedToId: string;
    shift: ShiftType;
    date: string;
    shiftScheduleId: string;
  },
) {
  const taskDate = startOfDay(input.date);
  const dueDate = endOfShiftDay(input.date);

  const createdTasks: PrismaTask[] = [];

  for (const taskTemplate of input.taskTemplates) {
    const created = await tx.task.create({
      data: {
        areaId: taskTemplate.areaId ?? null,
        title: taskTemplate.title,
        description: taskTemplate.description,
        type: taskTemplate.type,
        assignedById: input.assignedById,
        assignedToId: input.assignedToId,
        shift: input.shift,
        taskTemplateId: taskTemplate.id,
        shiftScheduleId: input.shiftScheduleId,
        taskDate,
        dueDate,
        status: "ditugaskan",
      },
    });

    await createTaskAuditLog(tx, {
      taskId: created.id,
      actorId: input.assignedById,
      action: "TASK_DIBUAT_DARI_MASTER",
      note: `Task "${created.title}" dibuat dari master task untuk shift ${SHIFT_LABELS[input.shift]}.`,
    });

    createdTasks.push(created);
  }

  if (createdTasks.length > 0) {
    await createNotifications(
      tx,
      createdTasks.map((task) => ({
        userId: task.assignedToId,
        title: "Tugas shift baru diterima",
        description: `Anda menerima penugasan "${task.title}" dari master shift.`,
      })),
    );
  }
}

function buildShiftTaskCreateInputs(input: {
  taskTemplates: PrismaTaskTemplate[];
  assignedById: string;
  assignedToId: string;
  shift: ShiftType;
  date: string;
  shiftScheduleId?: string;
}) {
  const taskDate = startOfDay(input.date);
  const dueDate = endOfShiftDay(input.date);

  return input.taskTemplates.map((taskTemplate) => ({
    areaId: taskTemplate.areaId ?? null,
    title: taskTemplate.title,
    description: taskTemplate.description,
    type: taskTemplate.type,
    assignedById: input.assignedById,
    assignedToId: input.assignedToId,
    shift: input.shift,
    taskTemplateId: taskTemplate.id,
    shiftScheduleId: input.shiftScheduleId ?? null,
    taskDate,
    dueDate,
    status: "ditugaskan" as const,
  }));
}

async function createShiftTaskSideEffects(input: {
  shiftScheduleId: string;
  assignedById: string;
  assignedToId: string;
  shift: ShiftType;
  taskTemplateIds?: string[];
}) {
  const createdTasks = await prisma.task.findMany({
    where: {
      shiftScheduleId: input.shiftScheduleId,
      assignedById: input.assignedById,
      assignedToId: input.assignedToId,
      shift: input.shift,
      ...(input.taskTemplateIds?.length
        ? {
            taskTemplateId: {
              in: input.taskTemplateIds,
            },
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      assignedToId: true,
    },
    orderBy: [{ createdAt: "asc" }, { title: "asc" }],
  });

  if (createdTasks.length === 0) {
    return;
  }

  await prisma.activityLog.createMany({
    data: createdTasks.map((task) => ({
      taskId: task.id,
      actorId: input.assignedById,
      action: "TASK_DIBUAT_DARI_MASTER",
      note: `Task "${task.title}" dibuat dari master task untuk shift ${SHIFT_LABELS[input.shift]}.`,
    })),
  });

  await prisma.notification.createMany({
    data: createdTasks.map((task) => ({
      userId: task.assignedToId,
      title: "Tugas shift baru diterima",
      description: `Anda menerima penugasan "${task.title}" dari master shift.`,
    })),
  });
}

function canMutateGeneratedTask(task: PrismaTask & { attachments?: PrismaAttachment[] }) {
  return (
    task.status === "ditugaskan" &&
    !task.employeeChecklistAt &&
    !task.supervisorApprovedAt &&
    !task.supervisorId &&
    !(task.attachments?.length ?? 0)
  );
}

function summarizeTasksByStatus<T extends { status: TaskStatus }>(tasks: T[]) {
  return {
    totalTasks: tasks.length,
    assignedTasks: tasks.filter((item) => ["draft", "ditugaskan"].includes(item.status)).length,
    finishedTasks: tasks.filter((item) =>
      ["selesai_karyawan", "menunggu_review_pengawas", "disetujui_pengawas", "selesai", "ditolak_revisi"].includes(
        item.status,
      ),
    ).length,
    reviewCount: tasks.filter((item) =>
      ["selesai_karyawan", "menunggu_review_pengawas"].includes(item.status),
    ).length,
    completedCount: tasks.filter((item) => ["disetujui_pengawas", "selesai"].includes(item.status)).length,
    revisionCount: tasks.filter((item) => item.status === "ditolak_revisi").length,
  };
}

async function assertUserRole(userId: string, role: UserRole) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== role) {
    throw new Error(role === "karyawan" ? "Karyawan tidak valid." : "Pengawas tidak valid.");
  }
}

const globalForBootstrap = globalThis as typeof globalThis & {
  bootstrapReady?: boolean;
  bootstrapPromise?: Promise<void>;
};

async function ensureBootstrapUsers() {
  const totalUsers = await prisma.user.count();
  if (totalUsers > 0) {
    return;
  }

  const passwordAdmin = process.env.SEED_ADMIN_PASSWORD ?? "AdminWcf123!";
  const passwordEmployee = process.env.SEED_EMPLOYEE_PASSWORD ?? "KaryawanWcf123!";
  const defaultPartner = await prisma.partner.upsert({
    where: {
      name: "Mitra Internal PT wcf",
    },
    update: {
      description: "Mitra awal untuk bootstrap data pengguna.",
    },
    create: {
      name: "Mitra Internal PT wcf",
      description: "Mitra awal untuk bootstrap data pengguna.",
    },
  });

  await prisma.user.createMany({
    data: [
      {
        name: "Administrator PT wcf",
        email: process.env.SEED_ADMIN_EMAIL ?? "admin@wcf.online",
        username: process.env.SEED_ADMIN_USERNAME ?? "admin",
        password: hashSync(passwordAdmin, 10),
        mustChangePassword: false,
        isActive: true,
        role: "pt_wcf",
        partnerId: defaultPartner.id,
        department: "Manajemen Operasional",
      },
      {
        name: "Petugas Operasional",
        email: process.env.SEED_EMPLOYEE_EMAIL ?? "operator@wcf.online",
        username: process.env.SEED_EMPLOYEE_USERNAME ?? "operator",
        password: hashSync(passwordEmployee, 10),
        mustChangePassword: false,
        isActive: true,
        role: "karyawan",
        partnerId: defaultPartner.id,
        department: defaultPartner.name,
      },
    ],
  });
}

export async function initializeData() {
  if (globalForBootstrap.bootstrapReady) {
    return;
  }

  if (!globalForBootstrap.bootstrapPromise) {
    globalForBootstrap.bootstrapPromise = ensureBootstrapUsers()
      .then(() => {
        globalForBootstrap.bootstrapReady = true;
      })
      .finally(() => {
        globalForBootstrap.bootstrapPromise = undefined;
      });
  }

  await globalForBootstrap.bootstrapPromise;
}

export async function listTaskTemplates() {
  const prismaWithTaskTemplate = prisma as PrismaWithTaskTemplateDelegate;
  if (!prismaWithTaskTemplate.taskTemplate) {
    return [];
  }

  const taskTemplates = await prismaWithTaskTemplate.taskTemplate.findMany({
    include: {
      area: true,
    },
    orderBy: [{ createdAt: "desc" }, { title: "asc" }],
  });

  return taskTemplates.map(mapTaskTemplate);
}

export async function listMasterAreas() {
  const areas = await prisma.masterArea.findMany({
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  return areas.map(mapMasterArea);
}

export async function listTaskPackages() {
  const taskPackages = await prisma.taskPackage.findMany({
    include: taskPackageInclude,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  return taskPackages.map(mapTaskPackage);
}

export async function createTaskTemplate(input: {
  areaId: string;
  title: string;
  description: string;
  type: TaskType;
}) {
  await assertMasterAreaExists(input.areaId);

  const taskTemplate = await prisma.taskTemplate.create({
    data: {
      areaId: input.areaId,
      title: input.title.trim(),
      description: input.description.trim(),
      type: input.type,
    },
    include: {
      area: true,
    },
  });

  return mapTaskTemplate(taskTemplate);
}

export async function createTaskPackage(input: {
  name: string;
  description?: string;
  taskTemplateIds: string[];
}) {
  const taskTemplates = await assertTaskTemplatesExist(input.taskTemplateIds);
  if (taskTemplates.length === 0) {
    throw new Error("Pilih minimal satu master task.");
  }

  try {
    const taskPackage = await prisma.taskPackage.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        taskTemplates: {
          create: taskTemplates.map((taskTemplate) => ({
            taskTemplateId: taskTemplate.id,
          })),
        },
      },
      include: taskPackageInclude,
    });

    return mapTaskPackage(taskPackage);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Nama paket master task sudah digunakan.");
    }

    throw error;
  }
}

export async function createMasterArea(input: {
  name: string;
}) {
  try {
    const area = await prisma.masterArea.create({
      data: {
        name: input.name.trim(),
      },
    });

    return mapMasterArea(area);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Nama area sudah digunakan.");
    }

    throw error;
  }
}

export async function updateTaskTemplate(
  taskTemplateId: string,
  input: Partial<{
    areaId: string;
    title: string;
    description: string;
    type: TaskType;
  }>,
) {
  try {
    if (input.areaId !== undefined) {
      await assertMasterAreaExists(input.areaId);
    }

    const taskTemplate = await prisma.taskTemplate.update({
      where: { id: taskTemplateId },
      data: {
        ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
        ...(input.title ? { title: input.title.trim() } : {}),
        ...(input.description ? { description: input.description.trim() } : {}),
        ...(input.type ? { type: input.type } : {}),
      },
      include: {
        area: true,
      },
    });

    return mapTaskTemplate(taskTemplate);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }

    throw error;
  }
}

export async function updateTaskPackage(
  taskPackageId: string,
  input: Partial<{
    name: string;
    description: string;
    taskTemplateIds: string[];
  }>,
) {
  try {
    const taskPackage = await prisma.$transaction(async (tx) => {
      const existing = await tx.taskPackage.findUnique({
        where: { id: taskPackageId },
        select: { id: true },
      });

      if (!existing) {
        return null;
      }

      let taskTemplates: PrismaTaskTemplate[] | null = null;
      if (input.taskTemplateIds !== undefined) {
        taskTemplates = await assertTaskTemplatesExist(input.taskTemplateIds, tx);
        if (taskTemplates.length === 0) {
          throw new Error("Pilih minimal satu master task.");
        }

        await tx.taskPackageItem.deleteMany({
          where: { taskPackageId },
        });

        await tx.taskPackageItem.createMany({
          data: taskTemplates.map((taskTemplate) => ({
            taskPackageId,
            taskTemplateId: taskTemplate.id,
          })),
        });
      }

      return tx.taskPackage.update({
        where: { id: taskPackageId },
        data: {
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        },
        include: taskPackageInclude,
      });
    });

    return taskPackage ? mapTaskPackage(taskPackage) : null;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return null;
      }
      if (error.code === "P2002") {
        throw new Error("Nama paket master task sudah digunakan.");
      }
    }

    throw error;
  }
}

export async function updateMasterArea(
  areaId: string,
  input: Partial<{
    name: string;
  }>,
) {
  try {
    const area = await prisma.masterArea.update({
      where: { id: areaId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
      },
    });

    return mapMasterArea(area);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return null;
      }
      if (error.code === "P2002") {
        throw new Error("Nama area sudah digunakan.");
      }
    }

    throw error;
  }
}

export async function deleteTaskTemplate(taskTemplateId: string) {
  const linkedTasks = await prisma.task.count({
    where: {
      taskTemplateId,
      status: {
        notIn: ["draft", "ditugaskan"],
      },
    },
  });

  if (linkedTasks > 0) {
    throw new Error("Master task tidak dapat dihapus karena sudah diproses pada task operasional.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.deleteMany({
        where: {
          taskTemplateId,
          status: {
            in: ["draft", "ditugaskan"],
          },
        },
      });

      await tx.taskTemplate.delete({
        where: { id: taskTemplateId },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new Error("Master task tidak ditemukan.");
    }

    throw error;
  }

  return true;
}

export async function deleteTaskPackage(taskPackageId: string) {
  try {
    await prisma.taskPackage.delete({
      where: { id: taskPackageId },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new Error("Paket master task tidak ditemukan.");
    }

    throw error;
  }
}

export async function getUsers(role?: UserRole, session?: SessionPayload) {
  await initializeData();
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(session?.role === "pengawas" && session.partnerId ? { partnerId: session.partnerId } : {}),
      ...(session?.role === "karyawan" ? { id: session.userId } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  return users.map(mapUser);
}

export async function listUsers(filters: UserFilters = {}) {
  await initializeData();

  const users = await prisma.user.findMany({
    where: {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { username: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
              { department: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  return users.map(mapUser);
}

export async function listUsersPaginated(
  filters: UserFilters = {},
  pagination: PaginationInput = {},
) {
  await initializeData();

  const requestedPage = Math.max(1, pagination.page ?? 1);
  const perPage = Math.max(1, pagination.perPage ?? 10);
  const where = {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { username: { contains: filters.search, mode: "insensitive" as const } },
            { email: { contains: filters.search, mode: "insensitive" as const } },
            { department: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  } satisfies Prisma.UserWhereInput;

  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);
  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    skip: (page - 1) * perPage,
    take: perPage,
  });

  return {
    items: users.map(mapUser),
    total,
    page,
    perPage,
    totalPages,
  };
}

export async function findUserById(userId: string) {
  await initializeData();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? mapUser(user) : null;
}

export async function findUserByIdentifier(identifier: string) {
  await initializeData();
  const normalized = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalized },
        { username: normalized },
      ],
    },
  });

  return user ? mapUser(user) : null;
}

export async function updateUserProfile(userId: string, input: { name: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
    },
  });

  return mapUser(user);
}

export async function createUser(
  session: SessionPayload,
  input: {
    name: string;
    username: string;
    email: string;
    role: "karyawan" | "pengawas";
    partnerId: string;
    password: string;
  },
) {
  await initializeData();

  const email = input.email.trim().toLowerCase() || null;
  const username = input.username.trim().toLowerCase();
  if (email) {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new Error("Email sudah digunakan.");
    }
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUsername) {
    throw new Error("Username sudah digunakan.");
  }

  const partner = await prisma.partner.findUnique({
    where: { id: input.partnerId },
    select: { id: true, name: true },
  });

  if (!partner) {
    throw new Error("Mitra tidak ditemukan.");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      username,
      email,
      role: input.role,
      partnerId: partner.id,
      department: partner.name,
      password: hashSync(input.password, 10),
      isActive: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      title: "Akun telah dibuat",
      description: `Akun Anda telah diaktifkan oleh ${session.name}.`,
    },
  });

  return mapUser(user);
}

export async function updateUser(
  session: SessionPayload,
  userId: string,
  input: {
    name: string;
    username: string;
    email: string;
    role: "karyawan" | "pengawas";
    partnerId: string;
    isActive: boolean;
  },
) {
  await initializeData();

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, username: true },
  });

  if (!existing) {
    return null;
  }

  if (existing.id === session.userId) {
    throw new Error("Akun yang sedang digunakan tidak dapat diubah dari modul ini.");
  }

  if (existing.role === "pt_wcf") {
    throw new Error("Akun administrator tidak dapat diubah dari modul ini.");
  }

  const email = input.email.trim().toLowerCase() || null;
  const username = input.username.trim().toLowerCase();
  if (email) {
    const duplicate = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== userId) {
      throw new Error("Email sudah digunakan.");
    }
  }

  const duplicateUsername = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (duplicateUsername && duplicateUsername.id !== userId) {
    throw new Error("Username sudah digunakan.");
  }

  const partner = await prisma.partner.findUnique({
    where: { id: input.partnerId },
    select: { id: true, name: true },
  });

  if (!partner) {
    throw new Error("Mitra tidak ditemukan.");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
      username,
      email,
      role: input.role,
      partnerId: partner.id,
      department: partner.name,
      isActive: input.isActive,
    },
  });

  return mapUser(user);
}

export async function listPartners() {
  const partners = await prisma.partner.findMany({
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  return partners.map(mapPartner);
}

export async function createPartner(input: { name: string; description?: string }) {
  const partner = await prisma.partner.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
    },
  });

  return mapPartner(partner);
}

export async function updatePartner(
  partnerId: string,
  input: { name?: string; description?: string },
) {
  const existing = await prisma.partner.findUnique({
    where: { id: partnerId },
  });

  if (!existing) {
    return null;
  }

  const name = input.name?.trim() ?? existing.name;
  const description = input.description !== undefined ? input.description.trim() || null : existing.description;

  const partner = await prisma.$transaction(async (tx) => {
    const updated = await tx.partner.update({
      where: { id: partnerId },
      data: {
        name,
        description,
      },
    });

    if (updated.name !== existing.name) {
      await tx.user.updateMany({
        where: { partnerId },
        data: { department: updated.name },
      });
    }

    return updated;
  });

  return mapPartner(partner);
}

export async function deletePartner(partnerId: string) {
  const existing = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!existing) {
    return null;
  }

  if (existing._count.users > 0) {
    throw new Error("Mitra masih dipakai oleh user dan tidak bisa dihapus.");
  }

  await prisma.partner.delete({
    where: { id: partnerId },
  });

  return mapPartner(existing);
}

export async function deleteUser(session: SessionPayload, userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      _count: {
        select: {
          assignedTasks: true,
          createdTasks: true,
          supervisedTasks: true,
          assignedShifts: true,
          attachments: true,
          activityLogs: true,
          notifications: true,
        },
      },
    },
  });

  if (!existing) {
    return false;
  }

  if (existing.id === session.userId) {
    throw new Error("Akun yang sedang digunakan tidak dapat dihapus.");
  }

  if (existing.role === "pt_wcf") {
    throw new Error("Akun administrator tidak dapat dihapus dari modul ini.");
  }

  const hasRelatedData = Object.values(existing._count).some((value) => value > 0);
  if (hasRelatedData) {
    throw new Error("User tidak dapat dihapus karena sudah memiliki relasi data operasional.");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return true;
}

export async function deleteMasterArea(areaId: string) {
  try {
    await prisma.masterArea.delete({
      where: { id: areaId },
    });

    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new Error("Master area tidak ditemukan.");
    }

    throw error;
  }
}

export async function changeUserPassword(userId: string, password: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashSync(password, 10),
      mustChangePassword: false,
    },
  });

  return mapUser(user);
}

export async function adminResetUserPassword(
  session: SessionPayload,
  userId: string,
  password: string,
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true },
  });

  if (!existing) {
    return null;
  }

  if (existing.role === "pt_wcf") {
    throw new Error("Password admin tidak dapat direset dari modul ini.");
  }

  if (existing.id === session.userId) {
    throw new Error("Gunakan menu ubah password untuk akun yang sedang dipakai.");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashSync(password, 10),
      mustChangePassword: true,
    },
  });

  return mapUser(user);
}

export async function listShiftSchedules(session: SessionPayload, filters: ShiftFilters = {}) {
  const where: Prisma.ShiftScheduleWhereInput = {
    ...shiftScope(session),
    ...(filters.date
      ? {
          date: {
            gte: startOfDay(filters.date),
            lt: endOfDay(filters.date),
          },
        }
      : {}),
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters.shift ? { shift: filters.shift as ShiftType } : {}),
  };

  const schedules = await prisma.shiftSchedule.findMany({
    where,
    include: shiftInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { shift: "asc" }],
  });

  return schedules.map(mapShift);
}

export async function createShiftSchedule(
  session: SessionPayload,
  input: {
    date: string;
    shift: ShiftType;
    employeeId: string;
    taskTemplateIds?: string[];
    note?: string;
  },
) {
  await assertUserRole(input.employeeId, "karyawan");
  const taskTemplates = await assertTaskTemplatesExist(input.taskTemplateIds ?? []);
  const createdTasks = buildShiftTaskCreateInputs({
    taskTemplates,
    assignedById: session.userId,
    assignedToId: input.employeeId,
    shift: input.shift,
    date: input.date,
  });

  try {
    const schedule = await prisma.shiftSchedule.create({
      data: {
        date: startOfDay(input.date),
        shift: input.shift,
        employeeId: input.employeeId,
        note: input.note?.trim() || null,
        taskTemplates: taskTemplates.length
          ? {
              create: taskTemplates.map((taskTemplate) => ({
                taskTemplateId: taskTemplate.id,
              })),
            }
          : undefined,
        tasks: createdTasks.length
          ? {
              create: createdTasks,
            }
          : undefined,
      },
      include: shiftInclude,
    });

    await createShiftTaskSideEffects({
      shiftScheduleId: schedule.id,
      assignedById: session.userId,
      assignedToId: input.employeeId,
      shift: input.shift,
    });

    return mapShift(schedule);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Jadwal untuk karyawan dan shift tersebut sudah ada.");
    }
    throw error;
  }
}

export async function createShiftSchedules(
  session: SessionPayload,
  input: {
    date: string;
    shift: ShiftType;
    employeeIds: string[];
    taskTemplateIds?: string[];
    note?: string;
  },
) {
  const employeeIds = [...new Set(input.employeeIds)];
  if (employeeIds.length === 0) {
    throw new Error("Pilih minimal satu karyawan.");
  }
  const taskTemplates = await assertTaskTemplatesExist(input.taskTemplateIds ?? []);
  for (const employeeId of employeeIds) {
    await assertUserRole(employeeId, "karyawan");
  }

  const date = startOfDay(input.date);
  const existing = await prisma.shiftSchedule.findMany({
    where: {
      date,
      shift: input.shift,
      employeeId: {
        in: employeeIds,
      },
    },
    include: shiftInclude,
  });

  if (existing.length > 0) {
    const names = existing.map((item) => item.employee.name).join(", ");
    throw new Error(`Jadwal untuk shift ini sudah ada: ${names}.`);
  }

  const createdSchedules = [];

  for (const employeeId of employeeIds) {
    const createdTasks = buildShiftTaskCreateInputs({
      taskTemplates,
      assignedById: session.userId,
      assignedToId: employeeId,
      shift: input.shift,
      date: input.date,
    });

    const schedule = await prisma.shiftSchedule.create({
      data: {
        date,
        shift: input.shift,
        employeeId,
        note: input.note?.trim() || null,
        taskTemplates: taskTemplates.length
          ? {
              create: taskTemplates.map((taskTemplate) => ({
                taskTemplateId: taskTemplate.id,
              })),
            }
          : undefined,
        tasks: createdTasks.length
          ? {
              create: createdTasks,
            }
          : undefined,
      },
      include: shiftInclude,
    });

    await createShiftTaskSideEffects({
      shiftScheduleId: schedule.id,
      assignedById: session.userId,
      assignedToId: employeeId,
      shift: input.shift,
    });

    createdSchedules.push(schedule);
  }

  return createdSchedules.map(mapShift);
}

export async function updateShiftSchedule(
  shiftId: string,
  session: SessionPayload,
  input: {
    date?: string;
    shift?: ShiftType;
    employeeId?: string;
    taskTemplateIds?: string[];
    note?: string;
  },
) {
  if (input.employeeId) {
    await assertUserRole(input.employeeId, "karyawan");
  }

  try {
    const existing = await prisma.shiftSchedule.findUnique({
      where: { id: shiftId },
      include: {
        taskTemplates: {
          include: {
            taskTemplate: true,
          },
        },
        tasks: {
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!existing) {
      return null;
    }

    const nextTaskTemplateIds =
      input.taskTemplateIds !== undefined
        ? [...new Set(input.taskTemplateIds)]
        : existing.taskTemplates.map((item) => item.taskTemplateId);
    const nextTaskTemplates = await assertTaskTemplatesExist(nextTaskTemplateIds);

    const nextEmployeeId = input.employeeId ?? existing.employeeId;
    const nextShift = input.shift ?? existing.shift;
    const nextDate = input.date ?? existing.date.toISOString().slice(0, 10);

    const lockedTasks = existing.tasks.filter((task) => !canMutateGeneratedTask(task));
    const hasStructuralChange =
      input.employeeId !== undefined || input.shift !== undefined || input.date !== undefined;

    if (lockedTasks.length > 0 && hasStructuralChange) {
      throw new Error("Jadwal tidak bisa diubah karena ada task turunan yang sudah diproses.");
    }

    const removedTaskTemplateIds = existing.taskTemplates
      .map((item) => item.taskTemplateId)
      .filter((taskTemplateId) => !nextTaskTemplateIds.includes(taskTemplateId));

    const blockedRemovedTasks = existing.tasks.filter(
      (task) =>
        task.taskTemplateId &&
        removedTaskTemplateIds.includes(task.taskTemplateId) &&
        !canMutateGeneratedTask(task),
    );

    if (blockedRemovedTasks.length > 0) {
      throw new Error("Beberapa master task tidak bisa dilepas karena task turunannya sudah diproses.");
    }

    if (removedTaskTemplateIds.length > 0) {
      await prisma.task.deleteMany({
        where: {
          shiftScheduleId: shiftId,
          taskTemplateId: {
            in: removedTaskTemplateIds,
          },
          status: {
            in: ["draft", "ditugaskan"],
          },
        },
      });

      await prisma.shiftTaskTemplate.deleteMany({
        where: {
          shiftScheduleId: shiftId,
          taskTemplateId: {
            in: removedTaskTemplateIds,
          },
        },
      });
    }

    const existingTaskTemplateIds = existing.taskTemplates.map((item) => item.taskTemplateId);
    const addedTaskTemplates = nextTaskTemplates.filter(
      (taskTemplate) => !existingTaskTemplateIds.includes(taskTemplate.id),
    );

    if (addedTaskTemplates.length > 0) {
      await prisma.shiftTaskTemplate.createMany({
        data: addedTaskTemplates.map((taskTemplate) => ({
          shiftScheduleId: shiftId,
          taskTemplateId: taskTemplate.id,
        })),
      });

      await prisma.task.createMany({
        data: buildShiftTaskCreateInputs({
          taskTemplates: addedTaskTemplates,
          assignedById: session.userId,
          assignedToId: nextEmployeeId,
          shift: nextShift,
          date: nextDate,
          shiftScheduleId: shiftId,
        }),
      });

      await createShiftTaskSideEffects({
        shiftScheduleId: shiftId,
        assignedById: session.userId,
        assignedToId: nextEmployeeId,
        shift: nextShift,
        taskTemplateIds: addedTaskTemplates.map((taskTemplate) => taskTemplate.id),
      });
    }

    if (hasStructuralChange) {
      await prisma.task.updateMany({
        where: {
          shiftScheduleId: shiftId,
          status: {
            in: ["draft", "ditugaskan"],
          },
        },
        data: {
          assignedToId: nextEmployeeId,
          shift: nextShift,
          taskDate: startOfDay(nextDate),
          dueDate: endOfShiftDay(nextDate),
        },
      });
    }

    await prisma.shiftSchedule.update({
      where: { id: shiftId },
      data: {
        ...(input.date ? { date: startOfDay(input.date) } : {}),
        ...(input.shift ? { shift: input.shift } : {}),
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.note !== undefined ? { note: input.note.trim() || null } : {}),
      },
    });

    const schedule = await prisma.shiftSchedule.findUnique({
      where: { id: shiftId },
      include: shiftInclude,
    });

    return schedule ? mapShift(schedule) : null;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return null;
      }
      if (error.code === "P2002") {
        throw new Error("Jadwal untuk karyawan dan shift tersebut sudah ada.");
      }
    }
    throw error;
  }
}

export async function deleteShiftSchedule(shiftId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const linkedTasks = await tx.task.findMany({
        where: { shiftScheduleId: shiftId },
        include: { attachments: true },
      });

      const lockedTasks = linkedTasks.filter((task) => !canMutateGeneratedTask(task));
      if (lockedTasks.length > 0) {
        throw new Error("Jadwal tidak bisa dihapus karena task turunannya sudah diproses.");
      }

      await tx.task.deleteMany({
        where: {
          shiftScheduleId: shiftId,
          status: {
            in: ["draft", "ditugaskan"],
          },
        },
      });

      await tx.shiftSchedule.delete({
        where: { id: shiftId },
      });
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return false;
    }
    throw error;
  }
}

export async function takeOverShiftTasks(
  shiftId: string,
  session: SessionPayload,
  input: {
    assigneeIds: string[];
  },
) {
  const assigneeIds = [...new Set(input.assigneeIds)];
  if (assigneeIds.length === 0) {
    throw new Error("Pilih minimal satu karyawan pengganti.");
  }
  if (assigneeIds.length > 2) {
    throw new Error("Take over hanya bisa dibagi ke maksimal dua karyawan.");
  }

  for (const assigneeId of assigneeIds) {
    await assertUserRole(assigneeId, "karyawan");
  }

  const sourceSchedule = await prisma.shiftSchedule.findUnique({
    where: { id: shiftId },
    include: {
      employee: true,
      tasks: {
        include: {
          attachments: true,
        },
        orderBy: [{ createdAt: "asc" }, { title: "asc" }],
      },
    },
  });

  if (!sourceSchedule) {
    return null;
  }

  if (assigneeIds.includes(sourceSchedule.employeeId)) {
    throw new Error("Karyawan yang tidak masuk tidak bisa menjadi penerima take over.");
  }

  const existingTargetSchedules = await prisma.shiftSchedule.findMany({
    where: {
      date: sourceSchedule.date,
      employeeId: {
        in: assigneeIds,
      },
      shift: sourceSchedule.shift,
    },
    include: {
      employee: true,
    },
  });

  const blockedTasks = sourceSchedule.tasks.filter((task) => !canMutateGeneratedTask(task));
  if (blockedTasks.length > 0) {
    throw new Error("Take over hanya bisa dilakukan untuk task aktif yang belum diproses.");
  }

  if (sourceSchedule.tasks.length === 0) {
    throw new Error("Tidak ada task aktif yang bisa dipindahkan dari jadwal ini.");
  }

  const targetByEmployeeId = new Map(
    existingTargetSchedules.map((schedule) => [schedule.employeeId, schedule]),
  );

  for (const assigneeId of assigneeIds) {
    if (targetByEmployeeId.has(assigneeId)) {
      continue;
    }

    const createdSchedule = await prisma.shiftSchedule.create({
      data: {
        date: sourceSchedule.date,
        shift: sourceSchedule.shift,
        employeeId: assigneeId,
        note: `Jadwal ${SHIFT_LABELS[sourceSchedule.shift]} dibuat otomatis dari take over ${sourceSchedule.employee.name}.`,
      },
      include: {
        employee: true,
      },
    });

    targetByEmployeeId.set(assigneeId, createdSchedule);
  }

  const auditLogs: Array<{
    taskId: string;
    actorId: string;
    action: string;
    note: string;
  }> = [];

  for (const [index, task] of sourceSchedule.tasks.entries()) {
    const assigneeId = assigneeIds[index % assigneeIds.length];
    const targetSchedule = targetByEmployeeId.get(assigneeId);

    if (!targetSchedule) {
      throw new Error("Jadwal karyawan pengganti tidak ditemukan.");
    }

    await prisma.task.update({
      where: { id: task.id },
      data: {
        assignedToId: assigneeId,
        shiftScheduleId: targetSchedule.id,
      },
    });

    if (task.taskTemplateId) {
      await prisma.shiftTaskTemplate.upsert({
        where: {
          shiftScheduleId_taskTemplateId: {
            shiftScheduleId: targetSchedule.id,
            taskTemplateId: task.taskTemplateId,
          },
        },
        update: {},
        create: {
          shiftScheduleId: targetSchedule.id,
          taskTemplateId: task.taskTemplateId,
        },
      });
    }

    auditLogs.push({
      taskId: task.id,
      actorId: session.userId,
      action: "TASK_TAKE_OVER",
      note: `Task "${task.title}" dipindahkan dari ${sourceSchedule.employee.name} ke ${targetSchedule.employee.name} melalui take over shift ${SHIFT_LABELS[sourceSchedule.shift]}.`,
    });
  }

  const movedTemplateIds = sourceSchedule.tasks
    .map((task) => task.taskTemplateId)
    .filter((taskTemplateId): taskTemplateId is string => Boolean(taskTemplateId));

  if (movedTemplateIds.length > 0) {
    await prisma.shiftTaskTemplate.deleteMany({
      where: {
        shiftScheduleId: shiftId,
        taskTemplateId: {
          in: [...new Set(movedTemplateIds)],
        },
      },
    });
  }

  if (auditLogs.length > 0) {
    await prisma.activityLog.createMany({
      data: auditLogs,
    });
  }

  await prisma.notification.createMany({
    data: sourceSchedule.tasks.map((task, index) => {
      const assigneeId = assigneeIds[index % assigneeIds.length];

      return {
        userId: assigneeId,
        title: "Task take over diterima",
        description: `Anda menerima take over task "${task.title}" dari ${sourceSchedule.employee.name}.`,
      };
    }),
  });

  const targetSchedules = [...targetByEmployeeId.values()];

  const targetNames = assigneeIds
    .map((assigneeId) => targetByEmployeeId.get(assigneeId)?.employee.name)
    .filter((name): name is string => Boolean(name));
  const takeOverNote = `Take over ${sourceSchedule.tasks.length} task ke ${targetNames.join(", ")}.`;
  const updatedNote = [sourceSchedule.note, takeOverNote]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 300);
  await prisma.shiftSchedule.update({
    where: { id: shiftId },
    data: {
      note: updatedNote || null,
    },
  });
  const changedSchedules = await prisma.shiftSchedule.findMany({
    where: {
      id: {
        in: [shiftId, ...targetSchedules.map((schedule) => schedule.id)],
      },
    },
    include: shiftInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { shift: "asc" }],
  });

  return {
    schedules: changedSchedules.map(mapShift),
    movedTasks: sourceSchedule.tasks.length,
    assignees: targetNames,
  };
}

export async function getShiftCalendarEvents(session: SessionPayload) {
  const schedules = await prisma.shiftSchedule.findMany({
    where: shiftScope(session),
    include: shiftCalendarInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { shift: "asc" }],
  });

  return schedules.map((schedule) => ({
    id: schedule.id,
    title: `${SHIFT_LABELS[schedule.shift]} • ${schedule.employee.name}`,
    start: schedule.date.toISOString().slice(0, 10),
    allDay: true,
    ...SHIFT_CALENDAR_COLORS[schedule.shift],
    extendedProps: {
      shift: schedule.shift,
      employeeId: schedule.employeeId,
      employee: schedule.employee.name,
      note: schedule.note,
      tasks: schedule.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description ?? "",
        area: task.area?.name ?? "-",
        status: task.status,
        supervisorNote: task.supervisorNote,
        attachmentCount: task.attachments.length,
        attachments: task.attachments.map((attachment) => ({
          id: attachment.id,
          fileUrl: attachment.fileUrl,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
        })),
        reviewer: task.supervisor?.name ?? null,
      })),
    },
  }));
}

export async function getNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return notifications.map(mapNotification);
  } catch (error) {
    console.error("Failed to load notifications", error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: {
      id: true,
      readAt: true,
    },
  });

  if (!notification) {
    throw new Error("Notifikasi tidak ditemukan.");
  }

  if (notification.readAt) {
    return;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function getApprovalPendingCount(session: SessionPayload) {
  if (session.role === "karyawan") {
    return 0;
  }

  const where: Prisma.TaskWhereInput =
    session.role === "pt_wcf"
      ? {
          status: "disetujui_pengawas",
        }
      : {
          ...taskScope(session),
          status: {
            in: ["selesai_karyawan", "menunggu_review_pengawas"],
          },
        };

  return prisma.task.count({ where });
}

export async function listTasks(session: SessionPayload, filters: TaskFilters = {}) {
  const where = buildTaskWhere(session, filters);
  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ taskDate: "desc" }, { createdAt: "desc" }],
  });

  return tasks.map(mapTask);
}

export async function getTaskById(taskId: string, session: SessionPayload) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      ...taskScope(session),
    },
    include: taskInclude,
  });

  return task ? mapTask(task) : null;
}

export async function getDashboardData(
  session: SessionPayload,
  filters: {
    date?: string;
    partnerId?: string;
  } = {},
) {
  const taskWhere = buildTaskWhere(session, {
    ...(filters.date ? { date: filters.date } : {}),
    ...(session.role === "pt_wcf" && filters.partnerId ? { partnerId: filters.partnerId } : {}),
  });

  const [tasks, employees] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      select: dashboardTaskSelect,
      orderBy: [{ taskDate: "desc" }, { createdAt: "desc" }],
    }),
    session.role === "pt_wcf"
      ? prisma.user.findMany({
          where: {
            role: "karyawan",
            ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
          },
          select: {
            id: true,
            name: true,
            partnerId: true,
            department: true,
          },
          orderBy: [{ createdAt: "desc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  const mappedTasks = tasks.map(mapTaskSummaryTask);
  const summary = summarizeTasksByStatus(mappedTasks);

  return {
    tasks: mappedTasks,
    summary,
    latestTasks: mappedTasks,
    employeeActivity: employees.map((employee) => ({
      employee: {
        id: employee.id,
        name: employee.name,
        partnerId: employee.partnerId,
        department: employee.department ?? "-",
      },
      summary: summarizeTasksByStatus(mappedTasks.filter((task) => task.assignedTo === employee.id)),
    })),
  };
}

export async function createTask(
  session: SessionPayload,
  input: {
    areaId: string;
    title: string;
    description?: string;
    type: TaskType;
    assignedTo: string;
    shift: ShiftType;
    dueDate: string;
    taskDate: string;
    status: "draft" | "ditugaskan";
  },
) {
  await assertUserRole(input.assignedTo, "karyawan");
  await assertMasterAreaExists(input.areaId);

  const taskDate = toIso(input.taskDate);
  const dueDate = toIso(input.dueDate);

  if (dueDate < taskDate) {
    throw new Error("Deadline tidak boleh lebih awal dari tanggal penugasan.");
  }

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        areaId: input.areaId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        assignedById: session.userId,
        assignedToId: input.assignedTo,
        shift: input.shift,
        dueDate,
        taskDate,
        status: input.status,
      },
      include: taskInclude,
    });

    await createTaskAuditLog(tx, {
      taskId: created.id,
      actorId: session.userId,
      action: "TASK_DIBUAT",
      note: `Task "${created.title}" dibuat dan ${created.status === "draft" ? "disimpan sebagai draft" : "ditugaskan ke pelaksana"}.`,
    });

    await createNotifications(tx, [
      {
        userId: created.assignedToId,
        title: "Tugas baru diterima",
        description: `Anda menerima penugasan "${created.title}".`,
      },
    ]);

    return created;
  });

  return mapTask(task);
}

export async function updateTask(
  taskId: string,
  session: SessionPayload,
  input: Partial<{
    areaId: string;
    title: string;
    description: string;
    type: TaskType;
    assignedTo: string;
    shift: ShiftType;
    dueDate: string;
    taskDate: string;
    status: TaskStatus;
  }>,
) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!existing) {
    return null;
  }

  if (existing.status === "selesai") {
    throw new Error("Tugas yang sudah selesai tidak dapat diubah lagi.");
  }

  if (input.assignedTo) {
    await assertUserRole(input.assignedTo, "karyawan");
  }
  if (input.areaId) {
    await assertMasterAreaExists(input.areaId);
  }

  if (input.status === "selesai" && existing.status !== "disetujui_pengawas") {
    throw new Error("Status selesai hanya bisa dipilih setelah tugas disetujui pengawas.");
  }

  const taskDate = input.taskDate ? toIso(input.taskDate) : existing.taskDate;
  const dueDate = input.dueDate ? toIso(input.dueDate) : existing.dueDate;

  if (dueDate < taskDate) {
    throw new Error("Deadline tidak boleh lebih awal dari tanggal penugasan.");
  }

  const task = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        ...(input.areaId ? { areaId: input.areaId } : {}),
        ...(input.title ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.assignedTo ? { assignedToId: input.assignedTo } : {}),
        ...(input.shift ? { shift: input.shift } : {}),
        ...(input.taskDate ? { taskDate } : {}),
        ...(input.dueDate ? { dueDate } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: taskInclude,
    });

    await createTaskAuditLog(tx, {
      taskId: updated.id,
      actorId: session.userId,
      action: "TASK_DIPERBARUI",
      note:
        input.status === "selesai"
          ? `Tugas "${updated.title}" ditandai selesai oleh admin.`
          : `Detail tugas "${updated.title}" diperbarui.`,
    });

    return updated;
  });

  return mapTask(task);
}

export async function deleteTask(taskId: string) {
  const attachments = await prisma.attachment.findMany({
    where: { taskId },
    select: { fileUrl: true },
  });

  try {
    await prisma.task.delete({
      where: { id: taskId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return false;
    }
    throw error;
  }

  await Promise.all(attachments.map((item) => removeStoredFile(item.fileUrl)));
  return true;
}

export async function completeTask(
  taskId: string,
  session: SessionPayload,
  input: {
    attachments: AttachmentInput[];
  },
) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      assignedToId: true,
    },
  });

  if (!existing || existing.assignedToId !== session.userId) {
    throw new Error("Task tidak ditemukan.");
  }

  if (["selesai_karyawan", "menunggu_review_pengawas", "disetujui_pengawas", "selesai"].includes(existing.status)) {
    throw new Error("Task yang sedang menunggu persetujuan atau sudah disetujui tidak dapat diubah.");
  }

  const storedAttachments = await Promise.all(input.attachments.map(storeAttachment));

  return completeTaskWithStoredAttachments(taskId, session, storedAttachments);
}

export async function completeTaskWithStoredAttachments(
  taskId: string,
  session: SessionPayload,
  storedAttachments: Array<{
    fileUrl: string;
    fileName: string;
    fileType: string;
  }>,
) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      assignedToId: true,
    },
  });

  if (!existing || existing.assignedToId !== session.userId) {
    throw new Error("Task tidak ditemukan.");
  }

  if (["selesai_karyawan", "menunggu_review_pengawas", "disetujui_pengawas", "selesai"].includes(existing.status)) {
    throw new Error("Task yang sedang menunggu persetujuan atau sudah disetujui tidak dapat diubah.");
  }

  try {
    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          employeeChecklistAt: new Date(),
          status: "selesai_karyawan",
          attachments: {
            createMany: {
              data: storedAttachments.map((item) => ({
                fileUrl: item.fileUrl,
                fileName: item.fileName,
                fileType: item.fileType,
                uploadedById: session.userId,
              })),
            },
          },
        },
        include: taskInclude,
      });

      await createTaskAuditLog(tx, {
        taskId,
        actorId: session.userId,
        action: "TASK_DISETORKAN",
        note: `Pelaksana mengirim hasil pekerjaan "${updated.title}" untuk ditinjau.`,
      });

      await createNotifications(tx, [
        ...(await getSupervisorUserIds(updated.assignedTo.partnerId, tx)).map((userId) => ({
          userId,
          title: "Hasil pekerjaan menunggu peninjauan",
          description: `Tugas "${updated.title}" telah diselesaikan oleh pelaksana dan siap diperiksa.`,
        })),
      ]);

      return updated;
    });

    return mapTask(task);
  } catch (error) {
    await Promise.all(storedAttachments.map((item) => removeStoredFile(item.fileUrl)));
    throw error;
  }
}

export async function reviewTask(
  taskId: string,
  session: SessionPayload,
  input: {
    decision: "approve" | "revise" | "under_review";
    supervisorNote?: string;
  },
) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      assignedToId: true,
      status: true,
    },
  });

  if (!existing) {
    throw new Error("Task tidak ditemukan.");
  }

  if (existing.status === "selesai") {
    throw new Error("Tugas yang sudah selesai tidak dapat direview ulang.");
  }

  const nextStatus: TaskStatus =
    input.decision === "approve"
      ? "disetujui_pengawas"
      : input.decision === "revise"
        ? "ditolak_revisi"
        : "menunggu_review_pengawas";

  const task = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: nextStatus,
        supervisorId: session.userId,
        supervisorNote: input.supervisorNote?.trim() || null,
        supervisorApprovedAt: input.decision === "approve" ? new Date() : null,
      },
      include: taskInclude,
    });

    await createTaskAuditLog(tx, {
      taskId,
      actorId: session.userId,
      action: "TASK_DIREVIEW",
      note: `Pengawas mengubah status "${updated.title}" menjadi ${STATUS_LABELS[nextStatus].toLowerCase()}.`,
    });

    await createNotifications(tx, [
      {
        userId: existing.assignedToId,
        title: "Status tugas diperbarui",
        description: `Tugas "${updated.title}" kini berstatus ${STATUS_LABELS[nextStatus]}.`,
      },
    ]);

    return updated;
  });

  return mapTask(task);
}

export async function getActivities(session: SessionPayload) {
  const activities = await prisma.activityLog.findMany({
    where: {
      task: taskScope(session),
    },
    include: {
      actor: true,
      task: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return activities.map(mapActivityLog);
}

export async function getCalendarEvents(session: SessionPayload) {
  const tasks = await prisma.task.findMany({
    where: buildTaskWhere(session),
    select: taskCalendarApiSelect,
    orderBy: [{ taskDate: "desc" }, { createdAt: "desc" }],
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    start: task.taskDate.toISOString(),
    end: task.dueDate.toISOString(),
    allDay: false,
    status: task.status,
    assignedTo: task.assignedTo.name,
    supervisor: task.supervisor?.name ?? "-",
  }));
}

export function getBlueprint() {
  return {
    techStack: [
      "Next.js 16 App Router",
      "React 19",
      "TypeScript",
      "Tailwind CSS 4",
      "Prisma + PostgreSQL",
      "JWT auth via secure HTTP-only cookie",
      "FullCalendar",
      "Zod validation",
    ],
    flow: [
      "Administrator membuat penugasan dan menetapkan pelaksana.",
      "Pelaksana menjalankan pekerjaan dan mengirim bukti lampiran.",
      "Pengawas meninjau hasil, lalu menyetujui, menahan review, atau meminta revisi.",
      "Setiap perubahan status tercatat dalam log aktivitas dan notifikasi pengguna terkait.",
    ],
    apiEndpoints: [
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "GET /api/auth/session",
      "GET /api/dashboard",
      "GET /api/tasks",
      "POST /api/tasks",
      "GET /api/tasks/:taskId",
      "PATCH /api/tasks/:taskId",
      "DELETE /api/tasks/:taskId",
      "POST /api/tasks/:taskId/complete",
      "POST /api/tasks/:taskId/review",
      "GET /api/calendar",
      "GET /api/history",
      "GET /api/shifts",
      "POST /api/shifts",
      "PATCH /api/shifts/:shiftId",
      "DELETE /api/shifts/:shiftId",
      "POST /api/shifts/:shiftId/takeover",
    ],
  };
}

export async function getTaskStats() {
  const [byStatus, byType, totalUsers, totalTasks] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.task.groupBy({
      by: ["type"],
      _count: {
        _all: true,
      },
    }),
    prisma.user.count(),
    prisma.task.count(),
  ]);

  return {
    byStatus: Object.keys(STATUS_LABELS).map((status) => ({
      status,
      label: STATUS_LABELS[status as TaskStatus],
      total: byStatus.find((item) => item.status === status)?._count._all ?? 0,
    })),
    byType: Object.keys(TASK_TYPE_LABELS).map((type) => ({
      type,
      label: TASK_TYPE_LABELS[type as TaskType],
      total: byType.find((item) => item.type === type)?._count._all ?? 0,
    })),
    totalUsers,
    totalTasks,
  };
}
