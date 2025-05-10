# Panduan Deploy Aplikasi Cerdas Cermat ke Glitch

Glitch adalah platform cloud yang memudahkan hosting aplikasi web secara gratis. Berikut langkah-langkah untuk men-deploy aplikasi Cerdas Cermat ke Glitch:

## Langkah 1: Persiapan Project di Glitch

1. Buat akun Glitch di [glitch.com](https://glitch.com) jika belum memiliki
2. Klik "New Project" dan pilih "Import from GitHub" atau "hello-webpage" lalu modifikasi

## Langkah 2: Upload atau Import Code

### Cara A: Import dari GitHub
Jika kode Anda ada di GitHub:
1. Klik "Tools" di pojok kiri bawah
2. Pilih "Import and Export"
3. Pilih "Import from GitHub"
4. Masukkan URL repository GitHub

### Cara B: Upload Files
Jika kode ada di komputer lokal:
1. Download semua file project dari Replit
2. Klik "Tools" di pojok kiri bawah Glitch
3. Pilih "Import and Export" 
4. Pilih "Upload a Folder"
5. Upload folder project Anda

## Langkah 3: Konfigurasi Glitch

1. Pastikan file-file konfigurasi Glitch berikut sudah ada:
   - `glitch.json`
   - `server/glitch.ts`
   - `server/index.glitch.ts`
   - `client/src/lib/glitch-socket.tsx`

2. Buat atau edit file `package.json` dan pastikan bagian scripts berisi:
   ```json
   "scripts": {
     "start": "NODE_ENV=production node build/server/index.js",
     "dev": "NODE_ENV=development tsx server/index.glitch.ts",
     "build": "vite build && mkdir -p build/server && esbuild server/index.glitch.ts --platform=node --packages=external --bundle --format=esm --outdir=build/server"
   }
   ```

## Langkah 4: Build dan Deploy

1. Di Glitch terminal (klik "Tools" > "Terminal"), jalankan:
   ```
   npm install
   npm run build
   refresh
   ```

2. Glitch akan secara otomatis menjalankan `npm start` setelah build selesai

## Troubleshooting

### 1. Jika build gagal:
Cek log error di terminal dan pastikan dependencies yang diperlukan sudah terinstal.

### 2. Jika WebSocket tidak terhubung:
Periksa browser console untuk error WebSocket. Pastikan `client/src/lib/glitch-socket.tsx` digunakan sebagai pengganti `socket.tsx` asli.

### 3. Jika aplikasi mati setelah beberapa saat:
Glitch gratis akan "sleep" setelah 5 menit tidak aktif. Gunakan service seperti [UptimeRobot](https://uptimerobot.com/) untuk menjaga aplikasi tetap berjalan.

### 4. Untuk melihat log runtime:
Klik "Tools" > "Logs" di Glitch untuk melihat log aplikasi.

## Adaptasi Kode Untuk Glitch

1. **Gunakan PORT dari Environment Variable**:
   ```typescript
   const port = process.env.PORT || 3000;
   ```

2. **Deteksi Host Glitch untuk WebSocket**:
   ```typescript
   const isGlitch = window.location.hostname.includes('glitch.me');
   ```

3. **Ganti Import File untuk Production**:
   Di `App.tsx`, ganti penggunaan socket:
   ```typescript
   // import { WebSocketProvider } from './lib/socket';
   import { WebSocketProvider } from './lib/glitch-socket';
   ```

## Perbedaan Penting antara Replit dan Glitch

1. Glitch tidak support reusePort option di listen
2. Glitch menggunakan lingkungan Node.js berbeda
3. Glitch memiliki struktur file build berbeda
4. Glitch akan sleep setelah 5 menit idle pada plan free

Setelah deploy selesai, aplikasi Anda akan tersedia di URL:
`https://[nama-project-anda].glitch.me`