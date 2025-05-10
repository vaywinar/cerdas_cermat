# PANDUAN MENJALANKAN APLIKASI DI LOCALHOST (WINDOWS)

## Persiapan Awal

1. **Instal Node.js dan NPM**:
   - Download dan instal Node.js versi terbaru dari [nodejs.org](https://nodejs.org/)
   - Pastikan Node.js dan NPM terinstal dengan menjalankan:
     ```
     node --version
     npm --version
     ```

2. **Clone Repository**:
   - Download atau clone repository ke komputer lokal Anda

## Struktur Folder

Pastikan struktur folder sudah benar, dengan folder utama:
- `client/` - Berisi kode frontend React
- `server/` - Berisi kode backend Express
- `shared/` - Berisi skema dan tipe data yang digunakan bersama

## Langkah-langkah Menjalankan Aplikasi

### 1. Buat File Batch untuk Development

Buat file bernama `start-dev.bat` di folder root dengan isi:

```batch
@echo off
echo Menginstal dependency yang diperlukan...
npm install
npm install cross-env --save-dev
npm install tsx --save-dev

echo Memulai server development...
npx cross-env NODE_ENV=development npx tsx server/index.ts
```

### 2. Buat File Batch untuk Production

Buat file bernama `start-prod.bat` di folder root dengan isi:

```batch
@echo off
echo Menginstal dependency yang diperlukan...
npm install
npm install cross-env --save-dev

echo Building aplikasi...
npx vite build
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo Memulai server production...
npx cross-env NODE_ENV=production node dist/index.js
```

### 3. Perbaiki Fungsi serveStatic

File `server/vite.ts` perlu dimodifikasi. Buat file bernama `vite.local.ts` dengan isi yang sama seperti `server/vite.ts`, tetapi ubah fungsi `serveStatic` menjadi:

```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.warn(`Could not find the build directory: ${distPath}, falling back to development mode`);
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

### 4. Jalankan Aplikasi

1. **Untuk Development**:
   - Klik dua kali pada `start-dev.bat`
   - Atau jalankan dari Command Prompt: `start-dev.bat`

2. **Untuk Production**:
   - Klik dua kali pada `start-prod.bat`
   - Atau jalankan dari Command Prompt: `start-prod.bat`

3. **Akses Aplikasi**:
   - Buka browser dan kunjungi: `http://localhost:5000`

## Troubleshooting

### 1. Error MODULE_NOT_FOUND

Jika melihat error seperti:
```
Error: Cannot find module 'C:\path\to\app\run'
```

Pastikan:
- Anda menjalankan file .bat dari direktori root aplikasi
- Semua dependency terinstal dengan benar
- Versi Node.js dan NPM kompatibel

### 2. Error NODE_ENV not recognized

Jika melihat error seperti:
```
'NODE_ENV' is not recognized as an internal or external command
```

Pastikan:
- `cross-env` sudah terinstal: `npm install cross-env --save-dev`
- Gunakan `npx cross-env NODE_ENV=development` alih-alih `NODE_ENV=development`

### 3. Error serveStatic tidak menemukan build directory

Jika melihat error seperti:
```
Could not find the build directory: ...\server\public
```

Ini terjadi karena Anda belum melakukan build terlebih dahulu. Pilih salah satu:
- Jalankan `npx vite build` dahulu, atau
- Gunakan mode development dengan `start-dev.bat`
- Atau gunakan modifikasi `vite.local.ts` yang sudah dibuat

### 4. Error WebSocket

Jika WebSocket tidak bekerja:
- Periksa apakah path WebSocket sudah benar: `/ws`
- Pastikan port tidak diblokir oleh firewall
- Di browser, gunakan alamat yang sama persis untuk halaman web dan WebSocket

## Catatan

1. Aplikasi akan berjalan di port 5000 (http://localhost:5000)
2. Dalam mode development, perubahan file akan otomatis dideteksi dan server akan di-restart
3. Dalam mode production, Anda perlu melakukan build ulang jika ada perubahan

Jika masih mengalami masalah, silakan kontak pengembang aplikasi.