import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { completeTask, completeTaskWithStoredAttachments, getTaskById } from "@/lib/data";
import { removeStoredFile, storeAttachmentFile } from "@/lib/storage";
import { completeTaskSchema } from "@/lib/validators";

export async function POST(request: Request, context: RouteContext<"/api/tasks/[taskId]/complete">) {
  const session = await getSession();
  if (!session || session.role !== "karyawan") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await context.params;
  const existing = await getTaskById(taskId, session);
  if (!existing) {
    return NextResponse.json({ error: "Task tidak ditemukan." }, { status: 404 });
  }

  if (["selesai_karyawan", "menunggu_review_pengawas", "disetujui_pengawas", "selesai"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Task yang sedang menunggu persetujuan atau sudah disetujui tidak bisa diubah oleh karyawan." },
      { status: 400 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const files = formData
        .getAll("attachments")
        .filter((value): value is File => value instanceof File);

      if (files.length === 0) {
        return NextResponse.json({ error: "Attachment wajib diunggah." }, { status: 400 });
      }

      const storedAttachments = await Promise.all(files.map(storeAttachmentFile));

      try {
        const task = await completeTaskWithStoredAttachments(taskId, session, storedAttachments);
        return NextResponse.json({ task });
      } catch (error) {
        await Promise.all(storedAttachments.map((item) => removeStoredFile(item.fileUrl)));
        throw error;
      }
    }

    const payload = completeTaskSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: payload.error.issues[0]?.message }, { status: 400 });
    }

    const task = await completeTask(taskId, session, payload.data);
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengirim hasil tugas." },
      { status: 400 },
    );
  }
}
