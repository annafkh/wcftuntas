import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpg",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type AttachmentInput = {
  fileUrl: string;
  fileName: string;
  fileType: string;
};

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function extensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    default:
      return "bin";
  }
}

function decodeDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Format lampiran tidak valid.");
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  if (buffer.length === 0 || buffer.length > MAX_ATTACHMENT_SIZE) {
    throw new Error("Ukuran lampiran melebihi batas 5 MB.");
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Tipe lampiran tidak diizinkan.");
  }

  return { mimeType, buffer };
}

async function persistAttachment(input: {
  mimeType: string;
  buffer: Buffer;
  fileName: string;
}) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const preferredName = sanitizeFileName(input.fileName);
  const extension = preferredName.includes(".")
    ? preferredName.split(".").pop() ?? extensionFromMimeType(input.mimeType)
    : extensionFromMimeType(input.mimeType);
  const fileName = `${randomUUID()}.${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  await writeFile(filePath, input.buffer);

  return {
    fileUrl: `/uploads/${fileName}`,
    fileName: preferredName || `${randomUUID()}.${extension}`,
    fileType: input.mimeType,
  };
}

export async function storeAttachment(input: AttachmentInput) {
  const { mimeType, buffer } = decodeDataUrl(input.fileUrl);
  return persistAttachment({
    mimeType,
    buffer,
    fileName: input.fileName,
  });
}

export async function storeAttachmentFile(file: File) {
  if (file.size === 0 || file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Ukuran lampiran melebihi batas 5 MB.");
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Tipe lampiran tidak diizinkan.");
  }

  return persistAttachment({
    mimeType,
    buffer: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
  });
}

export async function removeStoredFile(fileUrl: string) {
  if (!fileUrl.startsWith("/uploads/")) {
    return;
  }

  const filePath = path.join(UPLOAD_DIR, fileUrl.replace("/uploads/", ""));

  try {
    await unlink(filePath);
  } catch {
    // Ignore missing files to keep delete idempotent.
  }
}
