const crypto = require('crypto');

const TABLE_NAME = 'pkm_posts';

const VALID_PRODI = [
  'S1 Teknik Informatika',
  'S1 Teknik Elektro',
  'S1 Teknik Mesin',
  'S1 Sistem dan Teknologi Informasi',
  'D4 Teknologi Rekayasa Mekatronika',
];

const VALID_SKEMA = [
  'PKM-RE',
  'PKM-RSH',
  'PKM-K',
  'PKM-PM',
  'PKM-PI',
  'PKM-KC',
  'PKM-KI',
  'PKM-VGK',
  'PKM-GFT',
  'PKM-AI',
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabaseConfig() {
  const url = String(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  )
    .trim()
    .replace(/\/+$/, '');
  const key = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
  ).trim();

  if (!url || !key) {
    return null;
  }
  return { url, key };
}

function hashSecret(val) {
  if (!val) return '';
  return crypto.createHash('sha256').update(String(val)).digest('hex');
}

function safeHashEqual(expectedHex, rawInput) {
  if (!expectedHex || !rawInput) return false;
  const actualHex = hashSecret(rawInput);
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(actualHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normalizeWhatsApp(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  let normalized = digits;
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  } else if (normalized.startsWith('8')) {
    normalized = '62' + normalized;
  }
  return /^62\d{8,13}$/.test(normalized) ? normalized : '';
}

function isValidUuid(id) {
  return UUID_REGEX.test(String(id || '').trim());
}

function toPublicPost(row) {
  return {
    id: row.id,
    nama: row.nama,
    prodi: row.prodi,
    angkatan: row.angkatan,
    judulPkm: row.judul_pkm || '',
    skemaPkm: row.skema_pkm || '',
    whatsapp: row.whatsapp,
    tipe: row.tipe || 'cari-anggota',
    slotDibutuhkan: row.slot_dibutuhkan ?? null,
    kebutuhan: row.kebutuhan || '',
    status: row.status || 'open',
    createdAt: row.created_at,
    hasPin: Boolean(row.pin_hash),
  };
}

function verifyAuthorization(row, body) {
  const token = String(body.ownerToken || '').trim();
  const pin = String(body.pin || '').trim();
  if (safeHashEqual(row.owner_token_hash, token)) return true;
  if (safeHashEqual(row.pin_hash, pin)) return true;
  return false;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(req.body.trim() ? JSON.parse(req.body) : {});
      } catch {
        return Promise.reject(new Error('Format JSON tidak valid.'));
      }
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    const MAX_BYTES = 100 * 1024;
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BYTES) {
        reject(new Error('Payload terlalu besar.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Format JSON tidak valid.'));
      }
    });
    req.on('error', reject);
  });
}

async function supabaseFetch(pathAndQuery, options = {}) {
  const config = getSupabaseConfig();
  if (!config) {
    const err = new Error(
      'Konfigurasi Supabase belum diatur. Isi environment variable SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.'
    );
    err.statusCode = 500;
    throw err;
  }

  const isNewSecretKey = config.key.startsWith('sb_');
  const headers = {
    apikey: config.key,
    ...(isNewSecretKey ? {} : { Authorization: `Bearer ${config.key}` }),
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${config.url}/rest/v1/${pathAndQuery}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' ? data.message || data.hint || data.error : text;
    const err = new Error(detail || `Supabase error (${response.status})`);
    err.statusCode = response.status >= 500 ? 502 : response.status;
    throw err;
  }

  return data;
}

async function listPosts() {
  const rows = await supabaseFetch(
    `${TABLE_NAME}?select=id,nama,prodi,angkatan,judul_pkm,skema_pkm,whatsapp,tipe,slot_dibutuhkan,kebutuhan,status,pin_hash,created_at&order=created_at.desc`
  );
  return Array.isArray(rows) ? rows.map(toPublicPost) : [];
}

async function getPostById(id) {
  if (!isValidUuid(id)) return null;
  const rows = await supabaseFetch(
    `${TABLE_NAME}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function insertPost(body) {
  const nama = String(body.nama || '').trim();
  const prodi = String(body.prodi || '').trim();
  const angkatan = Number(body.angkatan);
  const whatsapp = normalizeWhatsApp(body.whatsapp);
  const judulPkm = String(body.judulPkm || '').trim().slice(0, 220);
  const rawSkema = String(body.skemaPkm || '').trim();
  const skemaPkm = VALID_SKEMA.includes(rawSkema) ? rawSkema : '';
  const kebutuhan = String(body.kebutuhan || '').trim().slice(0, 500);
  const tipeInput = String(body.tipe || '').trim();
  const tipe =
    tipeInput === 'cari-anggota' || tipeInput === 'cari-kelompok'
      ? tipeInput
      : judulPkm
        ? 'cari-anggota'
        : 'cari-kelompok';

  let slotDibutuhkan = null;
  if (
    tipe === 'cari-anggota' &&
    body.slotDibutuhkan !== undefined &&
    body.slotDibutuhkan !== '' &&
    body.slotDibutuhkan !== null
  ) {
    const parsedSlot = Number(body.slotDibutuhkan);
    if (Number.isInteger(parsedSlot) && parsedSlot >= 1 && parsedSlot <= 5) {
      slotDibutuhkan = parsedSlot;
    }
  }

  const pin = String(body.pin || '').trim();
  if (pin && !/^\d{4,6}$/.test(pin)) {
    const err = new Error('PIN opsional harus berupa 4–6 digit angka.');
    err.statusCode = 400;
    throw err;
  }

  if (nama.length < 2 || nama.length > 80) {
    const err = new Error('Nama wajib diisi (2–80 karakter).');
    err.statusCode = 400;
    throw err;
  }
  if (!VALID_PRODI.includes(prodi)) {
    const err = new Error('Pilih Program Studi FTII UHAMKA yang valid.');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isInteger(angkatan) || angkatan < 2018 || angkatan > 2028) {
    const err = new Error('Pilih tahun angkatan yang valid.');
    err.statusCode = 400;
    throw err;
  }
  if (!whatsapp) {
    const err = new Error('Nomor WhatsApp tidak valid (contoh: 081234567890).');
    err.statusCode = 400;
    throw err;
  }

  const ownerToken = crypto.randomBytes(16).toString('hex');
  const rows = await supabaseFetch(TABLE_NAME, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      nama,
      prodi,
      angkatan,
      judul_pkm: judulPkm,
      skema_pkm: skemaPkm,
      whatsapp,
      tipe,
      slot_dibutuhkan: slotDibutuhkan,
      kebutuhan,
      status: 'open',
      owner_token_hash: hashSecret(ownerToken),
      pin_hash: pin ? hashSecret(pin) : '',
    },
  });

  const created = Array.isArray(rows) ? rows[0] : rows;
  return {
    post: toPublicPost(created),
    ownerToken,
  };
}

async function updatePostStatus(id, body) {
  const existing = await getPostById(id);
  if (!existing) {
    const err = new Error('Postingan tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }
  if (!verifyAuthorization(existing, body)) {
    const err = new Error(
      'Akses ditolak. Gunakan perangkat pembuat postingan atau masukkan PIN yang benar.'
    );
    err.statusCode = 403;
    throw err;
  }

  const nextStatus = body.status === 'closed' ? 'closed' : 'open';
  const rows = await supabaseFetch(`${TABLE_NAME}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: { status: nextStatus },
  });

  const updated = Array.isArray(rows) ? rows[0] : rows;
  return toPublicPost(updated);
}

async function removePost(id, body) {
  const existing = await getPostById(id);
  if (!existing) {
    const err = new Error('Postingan tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }
  if (!verifyAuthorization(existing, body)) {
    const err = new Error(
      'Akses ditolak. Hanya pembuat postingan atau pemilik PIN yang dapat menghapus.'
    );
    err.statusCode = 403;
    throw err;
  }

  await supabaseFetch(`${TABLE_NAME}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return id;
}

module.exports = {
  VALID_PRODI,
  VALID_SKEMA,
  getSupabaseConfig,
  sendJson,
  readJsonBody,
  listPosts,
  insertPost,
  updatePostStatus,
  removePost,
};
