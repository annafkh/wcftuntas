# Deploy WCF Tuntas

Panduan ini dibuat untuk skenario production yang mudah dirawat: source code di GitHub, aplikasi jalan di server Node.js, database PostgreSQL, dan upload file tetap aman saat redeploy.

## Arsitektur yang disarankan

1. Domain: `wcftuntas.online`
2. Hosting aplikasi: VPS Rumahweb atau hosting Rumahweb yang benar-benar mendukung Node.js
3. Source code: GitHub
4. Runtime: Docker Compose
5. Database: PostgreSQL
6. Reverse proxy + SSL: Nginx + Let's Encrypt di server

Kenapa jalur ini paling aman:

- Aplikasi ini memakai Next.js server, bukan static site.
- Aplikasi ini memakai Prisma PostgreSQL.
- Aplikasi ini menyimpan attachment ke `public/uploads`, jadi perlu storage persisten.
- Update aplikasi akan lebih rapi bila source of truth ada di GitHub.

## Sebelum deploy

1. Pastikan `npm run build` lolos di lokal.
2. Buat repository GitHub untuk project ini.
3. Pastikan file rahasia tidak ikut di-push.
4. Siapkan server Linux yang bisa menjalankan Docker.

## File environment

1. Copy `.env.example` menjadi `.env`.
2. Ganti semua secret dan password default.
3. Untuk Docker Compose bawaan repo ini, `DATABASE_URL` dapat diarahkan ke service `db`.

Contoh:

```env
AUTH_SECRET=isi-random-string-minimal-32-karakter
DATABASE_URL=postgresql://wcftuntas:supersecret@db:5432/wcftuntas?schema=public
SHADOW_DATABASE_URL=postgresql://wcftuntas:supersecret@db:5432/wcftuntas_shadow?schema=public
SEED_ADMIN_EMAIL=admin@wcftuntas.online
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=ganti-password-kuat
SEED_EMPLOYEE_EMAIL=operator@wcftuntas.online
SEED_EMPLOYEE_USERNAME=operator
SEED_EMPLOYEE_PASSWORD=ganti-password-kuat
```

`SHADOW_DATABASE_URL` terutama dipakai saat development. Untuk production runtime biasa, yang paling penting adalah `DATABASE_URL` dan `AUTH_SECRET`.

## Jalur rekomendasi: VPS + Docker + GitHub

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial deployable version"
git branch -M main
git remote add origin <URL-REPO-GITHUB>
git push -u origin main
```

### 2. Siapkan server

Minimal server yang masuk akal untuk app ini:

- 2 vCPU
- 4 GB RAM
- 40 GB SSD
- Ubuntu 22.04 atau 24.04

Install dependency dasar:

```bash
sudo apt update
sudo apt install -y git nginx
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Logout lalu login lagi agar group Docker aktif.

### 3. Clone project di server

```bash
git clone <URL-REPO-GITHUB> /var/www/wcftuntas
cd /var/www/wcftuntas
cp .env.example .env
nano .env
```

### 4. Jalankan aplikasi

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Cek container:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

### 5. Nginx reverse proxy

Buat file `/etc/nginx/sites-available/wcftuntas.online`:

```nginx
server {
    server_name wcftuntas.online www.wcftuntas.online;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Aktifkan config:

```bash
sudo ln -s /etc/nginx/sites-available/wcftuntas.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Pasang SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d wcftuntas.online -d www.wcftuntas.online
```

### 7. Arahkan DNS domain

Di panel domain Rumahweb:

1. buat `A record` untuk `@` ke IP VPS
2. buat `A record` untuk `www` ke IP VPS
3. tunggu propagasi

## Cara update aplikasi

Saat ada perubahan baru:

```bash
cd /var/www/wcftuntas
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

## Backup yang wajib

1. Backup database PostgreSQL
2. Backup file upload di `public/uploads`
3. Backup file `.env`

Contoh backup database:

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U wcftuntas wcftuntas > backup.sql
```

## Jalur alternatif: cPanel / Developer Hosting

Jalur ini bisa dipakai bila Anda tidak ingin mengelola VPS, tetapi maintenance dan debugging biasanya lebih sempit dibanding VPS.

Garis besar:

1. aktifkan hosting yang mendukung Node.js
2. buat app Node.js di cPanel
3. upload source code
4. isi `.env`
5. jalankan `npm install`
6. jalankan `npx prisma generate`
7. jalankan `npx prisma migrate deploy`
8. start app

Untuk codebase ini, VPS tetap lebih cocok karena:

- lebih mudah backup
- lebih mudah menangani PostgreSQL
- lebih mudah menjaga folder upload persisten
- lebih mudah scale dan troubleshooting
