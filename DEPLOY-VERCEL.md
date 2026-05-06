## Deploy ke Vercel

Project ini bisa di-deploy ke Vercel, tetapi ada 2 penyesuaian penting dari setup lokal:

- `DATABASE_URL` tidak boleh memakai host lokal atau private yang hanya hidup di mesin development
- attachment production tidak boleh mengandalkan `public/uploads`, jadi gunakan Vercel Blob

### 1. Siapkan MySQL publik

Pilih salah satu:
- PlanetScale
- Railway MySQL
- Aiven MySQL
- MySQL server Anda sendiri

Isi environment variable berikut di Vercel:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/wcftuntas
AUTH_SECRET=ganti-dengan-random-secret-yang-panjang
SEED_ADMIN_EMAIL=admin@wcftuntas.online
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=AdminWcf123!
SEED_EMPLOYEE_EMAIL=operator@wcftuntas.online
SEED_EMPLOYEE_USERNAME=operator
SEED_EMPLOYEE_PASSWORD=OperatorWcf123!
```

Catatan:
- `SHADOW_DATABASE_URL` tidak diperlukan di runtime Vercel
- untuk migration dari lokal, tetap siapkan `SHADOW_DATABASE_URL` di mesin lokal

### 2. Siapkan Vercel Blob untuk attachment

Tambahkan Blob store di project Vercel, lalu set:

```env
BLOB_READ_WRITE_TOKEN=...
```

Jika variabel ini ada, attachment akan disimpan ke Vercel Blob. Jika tidak ada, app fallback ke filesystem lokal, yang hanya cocok untuk development lokal.

### 3. Import project ke Vercel

Build settings default sudah cukup:

- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`

`postinstall` sudah menjalankan `prisma generate`, jadi Prisma client akan ikut siap saat build.

### 3a. Environment variables yang diisi di Vercel

Copy dari [.env.vercel.example](/Users/annafifakhruddin/Documents/wcf/wcftuntas/.env.vercel.example:1), lalu isi nilai sebenarnya di dashboard Vercel.

Contoh:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/wcftuntas
AUTH_SECRET=secret-random-panjang
BLOB_READ_WRITE_TOKEN=...
```

### 4. Jalankan migration database

Saran paling aman: jalankan migration dari lokal atau CI, bukan dari runtime Vercel.

Contoh dari lokal:

```bash
npx prisma migrate deploy
```

Pastikan `DATABASE_URL` lokal diarahkan ke database production saat menjalankan command itu.

### 5. Hal yang perlu diubah dari `.env` sekarang

Value seperti ini tidak akan jalan di Vercel:

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/wcftuntas
```

Gunakan hostname database publik yang memang bisa diakses dari Vercel.

### 5a. Catatan setelah refactor dari PostgreSQL

- Folder `prisma/migrations` sekarang diasumsikan sebagai baseline MySQL baru.
- Jika Anda punya database PostgreSQL lama yang berisi data penting, migrasikan datanya secara terpisah sebelum cut-over.
- Jangan jalankan migration MySQL ini ke database PostgreSQL lama.

### 6. Verifikasi setelah deploy

Checklist minimum:
- halaman login terbuka
- login admin berhasil
- data seed otomatis muncul
- buat task berhasil
- upload attachment berhasil
- file attachment bisa dibuka dari browser
