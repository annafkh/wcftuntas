# Deploy ke cPanel Rumahweb

Panduan ini khusus untuk shared hosting cPanel Rumahweb yang mendukung Node.js.

## Arsitektur yang dipakai

1. Next.js dijalankan lewat `server.js`
2. Database memakai MySQL / MariaDB
3. Schema database dibuat dengan `prisma db push`
4. File upload tetap disimpan di `public/uploads`

## 1. Persiapan di localhost

Pastikan Anda memakai Node 22:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22
```

Copy `.env.example` ke `.env`, lalu isi `DATABASE_URL` sesuai format cPanel MySQL:

```env
AUTH_SECRET=ganti-random-string-panjang
DATABASE_URL=mysql://cpaneluser_dbuser:passwordkuat@localhost:3306/cpaneluser_wcftuntas
SEED_ADMIN_EMAIL=admin@wcftuntas.online
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=password-kuat-admin
SEED_EMPLOYEE_EMAIL=operator@wcftuntas.online
SEED_EMPLOYEE_USERNAME=operator
SEED_EMPLOYEE_PASSWORD=password-kuat-operator
```

Generate Prisma client dan build:

```bash
npm install
npm run db:generate
npm run build
```

## 2. Buat database MySQL di cPanel

Di cPanel:

1. buka `MySQL Databases`
2. buat database, misalnya `wcftuntas`
3. buat user database
4. hubungkan user ke database
5. beri privilege `ALL PRIVILEGES`

Biasanya nama akhirnya menjadi format cPanel seperti:

- database: `wcfw9782_wcftuntas`
- user: `wcfw9782_wcfuser`

Maka `DATABASE_URL` akan seperti:

```env
DATABASE_URL=mysql://wcfw9782_wcfuser:passwordkuat@localhost:3306/wcfw9782_wcftuntas
```

## 3. Setup Node.js App di cPanel

Di menu `Setup Node.js App`:

1. klik `Create Application`
2. pilih Node.js version yang paling baru tersedia dan masih kompatibel dengan Next 16
3. mode: `Production`
4. application root: misalnya `nodeapps/wcftuntas`
5. application URL: domain utama atau subdomain yang ingin dipakai
6. application startup file: `server.js`

Simpan sampai aplikasi Node.js terbentuk.

## 4. Upload project

Upload ke `application root` hasil setup Node.js:

1. semua file project
2. folder `.next`
3. file `server.js`
4. `package.json` dan `package-lock.json`
5. folder `prisma`
6. folder `public`

Jangan upload:

- `node_modules`
- `.env` dari lokal bila isinya berbeda dengan server

File `.env` harus dibuat ulang di server sesuai database hosting.

## 5. Install dependency di Terminal cPanel

Masuk ke `Terminal` cPanel, lalu masuk ke application root project.

Jalankan:

```bash
npm install
npx prisma generate
npx prisma db push
```

`db push` akan membuat struktur tabel MySQL langsung dari `prisma/schema.prisma`.

Jika server cPanel gagal saat `prisma generate`, `prisma db push`, atau `next build` dengan error seperti `pthread_create: Resource temporarily unavailable`, jangan lanjut build di server. Gunakan jalur fallback di bagian bawah dokumen ini.

## 6. Set environment variable

Di `.env` server, minimal isi:

```env
NODE_ENV=production
AUTH_SECRET=ganti-random-string-panjang
DATABASE_URL=mysql://wcfw9782_wcfuser:passwordkuat@localhost:3306/wcfw9782_wcftuntas
SEED_ADMIN_EMAIL=admin@wcftuntas.online
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=password-kuat-admin
SEED_EMPLOYEE_EMAIL=operator@wcftuntas.online
SEED_EMPLOYEE_USERNAME=operator
SEED_EMPLOYEE_PASSWORD=password-kuat-operator
```

## 7. Restart Node.js App

Setelah install selesai:

1. kembali ke `Setup Node.js App`
2. klik `Restart`

Kalau app gagal start, cek:

- `stderr.log`
- `stdout.log`
- isi `.env`
- kecocokan `DATABASE_URL`
- apakah `.next` ikut ter-upload

## 8. Cara update aplikasi

Setiap ada perubahan:

1. `npm run build` di lokal
2. upload file project terbaru, termasuk `.next`
3. di terminal cPanel jalankan:

```bash
npm install
npx prisma generate
npx prisma db push
```

4. restart Node.js App

## Catatan penting

1. Project ini sekarang ditargetkan ke MySQL untuk shared hosting.
2. Jangan jalankan `prisma migrate deploy` di shared hosting ini, karena repo ini sebelumnya punya history migration PostgreSQL lama.
3. Attachment disimpan di `public/uploads`, jadi jangan hapus folder itu saat update.

## Fallback untuk shared hosting ketat

Beberapa server cPanel membatasi thread proses Node.js. Gejalanya:

- `npm install` jalan, tetapi
- `npx prisma generate` gagal
- `npx prisma db push` gagal
- `npm run build` gagal
- pesan error mengandung `pthread_create: Resource temporarily unavailable`

Kalau itu terjadi, lakukan ini:

1. Build project di lokal, bukan di server.
2. Buat SQL schema awal di lokal.
3. Import SQL lewat phpMyAdmin.
4. Upload hasil build yang sudah jadi ke cPanel.

### Generate SQL schema awal di lokal

Gunakan command ini dari komputer lokal:

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema prisma/schema.prisma \
  --script > prisma/mysql-init.sql
```

Lalu import `prisma/mysql-init.sql` lewat phpMyAdmin.

Referensi Prisma:
- `migrate diff`: https://www.prisma.io/docs/cli/migrate/diff

### Build lokal

Di lokal:

```bash
npm install
npx prisma generate
npm run build
```

Lalu upload minimal:

- `.next`
- `public`
- `prisma`
- `server.js`
- `package.json`
- `package-lock.json`
- file aplikasi lain yang dibutuhkan runtime

Kalau server tetap tidak stabil menjalankan app Next.js meskipun build dilakukan di lokal, berarti limit shared hosting sudah menjadi blocker runtime, bukan hanya blocker build.
