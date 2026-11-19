# Forum Kelompok PKM — FTII UHAMKA

Web app forum pencarian kelompok **PKM** untuk mahasiswa **FTII UHAMKA** dengan tampilan minimalis ala Notion, mobile-friendly, dan terhubung langsung ke **Supabase** + **Vercel**.

## Struktur Proyek

```text
├── api/
│   └── posts/
│       ├── index.js          # GET & POST /api/posts
│       └── [id]/
│           ├── index.js      # DELETE /api/posts/:id
│           └── status.js     # PATCH /api/posts/:id/status
├── lib/
│   └── supabase.js           # Koneksi Supabase REST API & validasi
├── public/
│   ├── index.html            # Frontend UI
│   ├── styles.css            # Styling minimalis + responsif mobile
│   └── app.js                # Logic frontend
├── supabase/
│   └── schema.sql            # SQL pembuatan tabel pkm_posts
├── server.js                 # Server lokal (npm start)
├── vercel.json               # Konfigurasi Vercel
└── .env.example              # Contoh environment variables
```

## Cara Deploy ke Vercel + Supabase

### 1. Siapkan Tabel di Supabase
1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka menu **SQL Editor** → **New Query**.
3. Copy seluruh isi file `supabase/schema.sql`, paste, lalu klik **Run**.
4. Buka **Project Settings → API** (atau **API Keys**) dan salin:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role** / **secret key** (`SUPABASE_SERVICE_ROLE_KEY`)

### 2. Deploy ke Vercel
1. Push folder proyek ini ke repository GitHub kamu.
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repo tersebut.
3. Di bagian **Environment Variables**, tambahkan:
   - `SUPABASE_URL` = Project URL Supabase kamu
   - `SUPABASE_SERVICE_ROLE_KEY` = Service Role / Secret Key Supabase kamu
4. Klik **Deploy**. Selesai!

## Menjalankan Secara Lokal

1. Salin `.env.example` menjadi `.env.local` lalu isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`.
2. Jalankan:
   ```bash
   npm start
   ```
3. Buka `http://localhost:3000`.
