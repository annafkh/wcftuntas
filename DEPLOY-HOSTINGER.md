## Deploy ke Hostinger Business

Panduan ini untuk setup `Next.js + Prisma + MySQL` di Hostinger Business dengan source dari Git.

### 1. Siapkan database MySQL di hPanel

Di Hostinger, buat:
- database MySQL
- user MySQL
- password database

Simpan nilai:
- host
- port
- database name
- username
- password

Contoh connection string:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/wcftuntas
```

Untuk local development, siapkan juga:

```env
SHADOW_DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/wcftuntas_shadow
```

`SHADOW_DATABASE_URL` tidak diperlukan di runtime production. Ini hanya untuk `prisma migrate dev` di mesin development.

### 2. Push project ke GitHub

Pastikan branch yang akan dipakai deploy sudah berisi:
- schema Prisma MySQL
- folder `prisma/migrations` baseline MySQL
- file `.env` tidak ikut ter-commit

### 3. Import repository di Hostinger

Di hPanel:
1. buka `Websites`
2. pilih website
3. buka `Node.js`
4. pilih import atau deploy dari Git repository
5. hubungkan GitHub
6. pilih repository dan branch

### 4. Set environment variables

Isi minimal:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/wcftuntas
AUTH_SECRET=isi-random-secret-yang-panjang
SEED_ADMIN_EMAIL=admin@wcftuntas.online
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=AdminWcf123!
SEED_EMPLOYEE_EMAIL=operator@wcftuntas.online
SEED_EMPLOYEE_USERNAME=operator
SEED_EMPLOYEE_PASSWORD=OperatorWcf123!
```

Jika attachment production ingin durable storage lintas redeploy, tambahkan:

```env
BLOB_READ_WRITE_TOKEN=...
```

Kalau variabel ini tidak diisi, app akan fallback ke `public/uploads`, yang aman untuk setup sederhana tetapi kurang ideal untuk redeploy dan scaling.

### 5. Install dan build

Gunakan command default:

```bash
npm install
npm run build
```

`postinstall` akan menjalankan `prisma generate`.

### 6. Apply migration

Jalankan ke database MySQL production:

```bash
npx prisma migrate deploy
```

Ini sebaiknya dijalankan dari environment deploy atau dari mesin yang punya akses ke database production.

### 7. Verifikasi

Checklist minimum:
- halaman login terbuka
- login admin berhasil
- seed user otomatis muncul
- buat task berhasil
- approval workflow berjalan
- upload attachment berhasil
