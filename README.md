# WCF Tuntas

Aplikasi web checklist task untuk PT wcf dengan 3 role: `pt_wcf`, `karyawan`, dan `pengawas`. Fitur utama mencakup autentikasi berbasis role, dashboard berbeda per role, task list dengan filter, detail task, upload attachment bukti, approval workflow, riwayat aktivitas, dan kalender interaktif.

Catatan implementasi:
- UI dan route sudah siap dipakai untuk demo end-to-end.
- Backend memakai Prisma + MySQL.
- Attachment disimpan ke filesystem lokal saat development, dan bisa memakai Vercel Blob saat deploy di Vercel.

## 1. Struktur Folder Project

```text
app/
  (protected)/
    approval/
    calendar/
    dashboard/
    history/
    tasks/
      [taskId]/
      new/
  api/
    auth/
    calendar/
    dashboard/
    history/
    tasks/
  login/
components/
  app-shell.tsx
  login-form.tsx
  logout-button.tsx
  status-badge.tsx
  task-calendar.tsx
  task-completion-form.tsx
  task-create-form.tsx
  task-review-form.tsx
lib/
  auth.ts
  mock-db.ts
  rbac.ts
  types.ts
  utils.ts
  validators.ts
prisma/
  schema.prisma
proxy.ts
```

## 2. Tech Stack

- Frontend: Next.js 16 App Router, React 19, TypeScript
- Styling: Tailwind CSS 4
- Backend: Next.js Route Handlers
- Auth: JWT + HTTP-only cookie
- Database target: MySQL + Prisma
- Validation: Zod
- Calendar: FullCalendar

## 3. Database Schema

Entity utama:
- `User`
- `Task`
- `Attachment`
- `ActivityLog`
- `Notification`

Enum utama:
- `UserRole`: `pt_wcf`, `karyawan`, `pengawas`
- `TaskType`: `harian`, `mingguan`, `bulanan`
- `TaskPriority`: `rendah`, `sedang`, `tinggi`, `kritis`
- `TaskStatus`: `draft`, `ditugaskan`, `selesai_karyawan`, `menunggu_review_pengawas`, `disetujui_pengawas`, `ditolak_revisi`

Schema lengkap ada di [prisma/schema.prisma](/Users/annafifakhruddin/Documents/wcf/wcftuntas/prisma/schema.prisma:1).

## 4. API Endpoint

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/dashboard`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/[taskId]`
- `PATCH /api/tasks/[taskId]`
- `POST /api/tasks/[taskId]/complete`
- `POST /api/tasks/[taskId]/review`
- `GET /api/calendar`
- `GET /api/history`
- `GET /api/blueprint`

## 5. Flow Aplikasi

1. PT wcf login dan membuat task baru.
2. Task ditugaskan ke karyawan tanpa pengawas tetap.
3. Karyawan melihat task pada list dan kalender.
4. Karyawan menyelesaikan task lalu upload attachment/foto bukti.
5. Status menjadi `Selesai oleh Karyawan`.
6. Pengawas membuka approval queue.
7. Pengawas memeriksa detail task dan attachment.
8. Pengawas wajib mengisi `Keterangan Pengawas`.
9. Pengawas menyetujui task atau meminta revisi.
10. Semua perubahan masuk ke activity log dan notification feed.

## 6. Kode Frontend dan Backend Utama

Frontend utama:
- [app/(protected)/dashboard/page.tsx](/Users/annafifakhruddin/Documents/wcf/wcftuntas/app/(protected)/dashboard/page.tsx:1)
- [app/(protected)/tasks/page.tsx](/Users/annafifakhruddin/Documents/wcf/wcftuntas/app/(protected)/tasks/page.tsx:1)
- [app/(protected)/tasks/[taskId]/page.tsx](/Users/annafifakhruddin/Documents/wcf/wcftuntas/app/(protected)/tasks/[taskId]/page.tsx:1)
- [components/task-completion-form.tsx](/Users/annafifakhruddin/Documents/wcf/wcftuntas/components/task-completion-form.tsx:1)
- [components/task-review-form.tsx](/Users/annafifakhruddin/Documents/wcf/wcftuntas/components/task-review-form.tsx:1)
- [components/task-calendar.tsx](/Users/annafifakhruddin/Documents/wcf/wcftuntas/components/task-calendar.tsx:1)

Backend utama:
- [app/api/tasks/route.ts](/Users/annafifakhruddin/Documents/wcf/wcftuntas/app/api/tasks/route.ts:1)
- [app/api/tasks/[taskId]/complete/route.ts](/Users/annafifakhruddin/Documents/wcf/wcftuntas/app/api/tasks/[taskId]/complete/route.ts:1)
- [app/api/tasks/[taskId]/review/route.ts](/Users/annafifakhruddin/Documents/wcf/wcftuntas/app/api/tasks/[taskId]/review/route.ts:1)
- [app/api/auth/login/route.ts](/Users/annafifakhruddin/Documents/wcf/wcftuntas/app/api/auth/login/route.ts:1)
- [lib/data.ts](/Users/annafifakhruddin/Documents/wcf/wcftuntas/lib/data.ts:1)
- [lib/prisma.ts](/Users/annafifakhruddin/Documents/wcf/wcftuntas/lib/prisma.ts:1)
- [lib/auth.ts](/Users/annafifakhruddin/Documents/wcf/wcftuntas/lib/auth.ts:1)

## 7. Dummy Data

Dummy akun:
- PT wcf: `admin@wcf.co.id` / `ptwcf123`
- Karyawan: `rina@wcf.co.id` / `karyawan123`
- Pengawas: `mira@wcf.co.id` / `pengawas123`

Data awal akan dibuat otomatis saat login pertama melalui proses inisialisasi di [lib/data.ts](/Users/annafifakhruddin/Documents/wcf/wcftuntas/lib/data.ts:660).

## 8. Panduan Menjalankan Project

1. Install dependency:

```bash
npm install
```

2. Jalankan development server:

```bash
npm run dev
```

3. Buka `http://localhost:3000`.

4. Login dengan salah satu dummy account di atas.

5. Isi `.env` minimal dengan:
- `DATABASE_URL`
- `SHADOW_DATABASE_URL` untuk migration lokal Prisma
- `AUTH_SECRET`

6. Jalankan migration:

```bash
npx prisma migrate dev
```

## Deploy ke Vercel

Deploy ke Vercel bisa dipakai untuk aplikasi ini, dengan syarat:
- `DATABASE_URL` harus mengarah ke MySQL publik, bukan host lokal seperti `127.0.0.1` atau socket lokal
- `AUTH_SECRET` wajib diisi di Project Settings Vercel
- `BLOB_READ_WRITE_TOKEN` wajib diisi jika ingin attachment tetap jalan di production

Langkah detail ada di [DEPLOY-VERCEL.md](/Users/annafifakhruddin/Documents/wcf/wcftuntas/DEPLOY-VERCEL.md:1).
Jika target Anda Hostinger Business, lihat juga [DEPLOY-HOSTINGER.md](/Users/annafifakhruddin/Documents/wcf/wcftuntas/DEPLOY-HOSTINGER.md:1).

## Validasi Bisnis yang Sudah Diimplementasikan

- Karyawan tidak bisa submit selesai tanpa attachment
- Pengawas tidak bisa approve/revisi tanpa mengisi keterangan
- Route protected memakai `proxy.ts` dan pemeriksaan session server-side
- Role tertentu saja yang bisa memakai fitur tertentu
- Task yang sudah disetujui tidak bisa diubah lagi oleh karyawan
