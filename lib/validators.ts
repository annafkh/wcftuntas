import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .max(120, "Email terlalu panjang.")
  .refine((value) => value === "" || z.email().safeParse(value).success, "Email tidak valid.");

const taskStatusSchema = z.enum([
  "draft",
  "ditugaskan",
  "selesai_karyawan",
  "menunggu_review_pengawas",
  "disetujui_pengawas",
  "selesai",
  "ditolak_revisi",
]);

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Username atau email wajib diisi."),
  password: z.string().min(6, "Password minimal 6 karakter."),
});

export const taskFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  assignedTo: z.string().optional(),
  date: z.string().optional(),
  shift: z.enum(["pagi", "middle", "siang", "mingguan", "bulanan"]).optional(),
});

export const shiftFiltersSchema = z.object({
  date: z.string().optional(),
  employeeId: z.string().optional(),
  shift: z.enum(["pagi", "middle", "siang", "mingguan", "bulanan"]).optional(),
});

export const createTaskSchema = z.object({
  areaId: z.string().min(1, "Area wajib dipilih."),
  title: z.string().min(3).max(120),
  description: z.string().trim().max(2000, "Deskripsi terlalu panjang.").optional().or(z.literal("")),
  type: z.enum(["harian", "mingguan", "bulanan"]),
  assignedTo: z.string().min(1),
  shift: z.enum(["pagi", "middle", "siang", "mingguan", "bulanan"]),
  dueDate: z.string().min(1),
  taskDate: z.string().min(1),
  status: z.enum(["draft", "ditugaskan"]).default("ditugaskan"),
});

export const updateTaskSchema = z.object({
  areaId: z.string().min(1).optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().trim().max(2000, "Deskripsi terlalu panjang.").optional().or(z.literal("")),
  type: z.enum(["harian", "mingguan", "bulanan"]).optional(),
  assignedTo: z.string().min(1).optional(),
  shift: z.enum(["pagi", "middle", "siang", "mingguan", "bulanan"]).optional(),
  dueDate: z.string().min(1).optional(),
  taskDate: z.string().min(1).optional(),
  status: taskStatusSchema.optional(),
});

export const createMasterAreaSchema = z.object({
  name: z.string().trim().min(3, "Nama area minimal 3 karakter.").max(120, "Nama area terlalu panjang."),
});

export const updateMasterAreaSchema = createMasterAreaSchema.partial();

export const createTaskTemplateSchema = z.object({
  areaId: z.string().min(1, "Area wajib dipilih."),
  title: z.string().trim().min(3, "Judul task minimal 3 karakter.").max(120, "Judul task terlalu panjang."),
  description: z
    .string()
    .trim()
    .min(10, "Deskripsi task minimal 10 karakter.")
    .max(2000, "Deskripsi task terlalu panjang."),
  type: z.enum(["harian", "mingguan", "bulanan"]),
});

export const updateTaskTemplateSchema = createTaskTemplateSchema.partial();

export const createTaskPackageSchema = z.object({
  name: z.string().trim().min(3, "Nama paket minimal 3 karakter.").max(120, "Nama paket terlalu panjang."),
  description: z.string().trim().max(500, "Deskripsi paket terlalu panjang.").optional().or(z.literal("")),
  taskTemplateIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu master task."),
});

export const updateTaskPackageSchema = createTaskPackageSchema.partial();

export const attachmentPayloadSchema = z.object({
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});

export const completeTaskSchema = z.object({
  attachments: z.array(attachmentPayloadSchema).min(1, "Attachment wajib diunggah."),
});

export const reviewTaskSchema = z.object({
  decision: z.enum(["approve", "revise", "under_review"]),
  supervisorNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(80, "Nama terlalu panjang."),
});

export const userFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(["pt_wcf", "karyawan", "pengawas"]).optional(),
  partnerId: z.string().optional(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(80, "Nama terlalu panjang."),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(40, "Username terlalu panjang.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berisi huruf, angka, titik, strip, atau underscore."),
  email: optionalEmailSchema,
  role: z.enum(["karyawan", "pengawas"], "Role user tidak valid."),
  partnerId: z.string().min(1, "Mitra wajib dipilih."),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .max(100, "Password terlalu panjang."),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(80, "Nama terlalu panjang."),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(40, "Username terlalu panjang.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berisi huruf, angka, titik, strip, atau underscore."),
  email: optionalEmailSchema,
  role: z.enum(["karyawan", "pengawas"], "Role user tidak valid."),
  partnerId: z.string().min(1, "Mitra wajib dipilih."),
  isActive: z.boolean(),
});

export const adminResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .max(100, "Password terlalu panjang."),
});

export const createPartnerSchema = z.object({
  name: z.string().trim().min(3, "Nama mitra minimal 3 karakter.").max(120, "Nama mitra terlalu panjang."),
  description: z.string().trim().max(500, "Deskripsi mitra terlalu panjang.").optional().or(z.literal("")),
});

export const updatePartnerSchema = createPartnerSchema.partial();

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password minimal 8 karakter.")
      .max(100, "Password terlalu panjang."),
    confirmPassword: z
      .string()
      .min(8, "Konfirmasi password minimal 8 karakter.")
      .max(100, "Konfirmasi password terlalu panjang."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi password harus sama.",
    path: ["confirmPassword"],
  });

const shiftSchemaBase = z.object({
  date: z.string().min(1, "Tanggal wajib diisi."),
  shift: z.enum(["pagi", "middle", "siang", "mingguan", "bulanan"]),
  employeeId: z.string().min(1, "Karyawan wajib dipilih.").optional(),
  employeeIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu karyawan.").optional(),
  taskTemplateIds: z.array(z.string().min(1)).optional(),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const createShiftSchema = shiftSchemaBase.refine((value) => Boolean(value.employeeId) || Boolean(value.employeeIds?.length), {
  message: "Pilih minimal satu karyawan.",
  path: ["employeeIds"],
});

export const updateShiftSchema = shiftSchemaBase.partial();

export const takeOverShiftSchema = z.object({
  assigneeIds: z
    .array(z.string().min(1))
    .min(1, "Pilih minimal satu karyawan pengganti.")
    .max(2, "Take over hanya bisa dibagi ke maksimal dua karyawan."),
});
