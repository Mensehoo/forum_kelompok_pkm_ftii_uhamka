-- Jalankan script ini satu kali di Supabase Dashboard -> SQL Editor

create table if not exists public.pkm_posts (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  prodi text not null,
  angkatan integer not null,
  judul_pkm text not null default '',
  skema_pkm text not null default '',
  whatsapp text not null,
  tipe text not null default 'cari-anggota' check (tipe in ('cari-anggota', 'cari-kelompok')),
  slot_dibutuhkan integer check (slot_dibutuhkan is null or (slot_dibutuhkan >= 1 and slot_dibutuhkan <= 5)),
  kebutuhan text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  owner_token_hash text not null default '',
  pin_hash text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_pkm_posts_created_at
  on public.pkm_posts (created_at desc);

-- Aktifkan Row Level Security agar database tidak bisa diakses langsung dari browser.
-- Semua baca/tulis dilakukan melalui Vercel Serverless API (/api/posts) memakai Service Role Key.
alter table public.pkm_posts enable row level security;
