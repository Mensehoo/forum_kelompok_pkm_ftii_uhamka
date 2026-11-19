(() => {
  'use strict';

  const OWNER_TOKENS_KEY = 'pkm_ftii_owner_tokens_v1';

  const PRODI_SHORT = {
    'S1 Teknik Informatika': 'Teknik Informatika',
    'S1 Teknik Elektro': 'Teknik Elektro',
    'S1 Teknik Mesin': 'Teknik Mesin',
    'S1 Sistem dan Teknologi Informasi': 'Sistem & Tek. Informasi',
    'D4 Teknologi Rekayasa Mekatronika': 'Tek. Rekayasa Mekatronika',
  };

  const state = {
    posts: [],
    loading: true,
    loadError: '',
    activeTab: 'all',
    search: '',
    prodi: '',
    skema: '',
    angkatan: '',
    sort: 'newest',
    formMode: 'cari-anggota',
    managingPostId: null,
  };

  const dom = {
    pageMeta: document.getElementById('pageMeta'),
    countAll: document.getElementById('countAll'),
    countOpen: document.getElementById('countOpen'),
    countWithIdea: document.getElementById('countWithIdea'),
    countWithoutIdea: document.getElementById('countWithoutIdea'),

    postsGrid: document.getElementById('postsGrid'),
    emptyState: document.getElementById('emptyState'),

    searchInput: document.getElementById('searchInput'),
    filterProdi: document.getElementById('filterProdi'),
    filterSkema: document.getElementById('filterSkema'),
    filterAngkatan: document.getElementById('filterAngkatan'),
    sortSelect: document.getElementById('sortSelect'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    viewTabs: document.querySelectorAll('.view-tab'),

    btnOpenPostModal: document.getElementById('btnOpenPostModal'),
    btnHeroHasIdea: document.getElementById('btnHeroHasIdea'),
    btnHeroNoIdea: document.getElementById('btnHeroNoIdea'),
    btnEmptyCreate: document.getElementById('btnEmptyCreate'),
    btnEmptyReset: document.getElementById('btnEmptyReset'),
    btnOpenGuide: document.getElementById('btnOpenGuide'),

    postModal: document.getElementById('postModal'),
    guideModal: document.getElementById('guideModal'),
    manageModal: document.getElementById('manageModal'),

    postForm: document.getElementById('postForm'),
    modeButtons: document.querySelectorAll('.seg-btn'),
    pkmFieldsBox: document.getElementById('pkmFieldsBox'),
    labelKebutuhan: document.getElementById('labelKebutuhan'),
    inputNama: document.getElementById('inputNama'),
    inputProdi: document.getElementById('inputProdi'),
    inputAngkatan: document.getElementById('inputAngkatan'),
    inputWhatsapp: document.getElementById('inputWhatsapp'),
    waPreviewHint: document.getElementById('waPreviewHint'),
    inputJudul: document.getElementById('inputJudul'),
    inputSkema: document.getElementById('inputSkema'),
    inputSlot: document.getElementById('inputSlot'),
    inputKebutuhan: document.getElementById('inputKebutuhan'),
    inputPin: document.getElementById('inputPin'),
    formError: document.getElementById('formError'),
    btnSubmitPost: document.getElementById('btnSubmitPost'),

    managePostOwnerName: document.getElementById('managePostOwnerName'),
    managePinWrap: document.getElementById('managePinWrap'),
    managePinInput: document.getElementById('managePinInput'),
    manageError: document.getElementById('manageError'),
    btnToggleStatus: document.getElementById('btnToggleStatus'),
    btnDeletePost: document.getElementById('btnDeletePost'),

    toastContainer: document.getElementById('toastContainer'),
  };

  // ==================== HELPERS ====================
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  function formatDisplayPhone(wa62) {
    if (!wa62) return '';
    const local = wa62.startsWith('62') ? '0' + wa62.slice(2) : wa62;
    return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }

  function buildWhatsAppUrl(post) {
    const firstName = post.nama.split(/\s+/)[0] || post.nama;
    let text;
    if (post.judulPkm) {
      const skemaPart = post.skemaPkm ? ` (${post.skemaPkm})` : '';
      text = `Halo ${firstName}, saya lihat postingan kamu di Forum Kelompok PKM FTII UHAMKA tentang PKM${skemaPart} "${post.judulPkm}". Boleh ngobrol soal gabung kelompok?`;
    } else if (post.skemaPkm) {
      text = `Halo ${firstName}, saya lihat postingan kamu di Forum Kelompok PKM FTII UHAMKA (${post.skemaPkm}). Boleh diskusi bareng soal kelompok PKM?`;
    } else {
      text = `Halo ${firstName}, saya lihat postingan kamu di Forum Kelompok PKM FTII UHAMKA. Saya juga lagi cari kelompok PKM, boleh diskusi bareng?`;
    }
    return `https://wa.me/${post.whatsapp}?text=${encodeURIComponent(text)}`;
  }

  function formatCompactTime(isoDate) {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}j`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}h`;
    return new Date(isoDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  }

  function getTagClass(skema) {
    if (!skema) return 'tag-none';
    return `tag-${skema.replace('PKM-', '').toLowerCase()}`;
  }

  function getOwnerTokens() {
    try {
      return JSON.parse(localStorage.getItem(OWNER_TOKENS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveOwnerToken(postId, token) {
    if (!token) return;
    const tokens = getOwnerTokens();
    tokens[postId] = token;
    localStorage.setItem(OWNER_TOKENS_KEY, JSON.stringify(tokens));
  }

  function getOwnerToken(postId) {
    return getOwnerTokens()[postId] || '';
  }

  function showToast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    dom.toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.18s ease';
      setTimeout(() => el.remove(), 200);
    }, 2600);
  }

  // ==================== DATA LAYER (SUPABASE VIA /api/posts) ====================
  async function fetchPosts() {
    state.loading = true;
    state.loadError = '';
    render();

    try {
      const res = await fetch('/api/posts');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat data dari server.');
      }
      state.posts = Array.isArray(data.posts) ? data.posts : [];
    } catch (err) {
      state.posts = [];
      state.loadError = err.message || 'Tidak dapat terhubung ke server.';
    } finally {
      state.loading = false;
      render();
    }
  }

  async function createPost(payload) {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Gagal mengunggah postingan.');
    saveOwnerToken(data.post.id, data.ownerToken);
    state.posts.unshift(data.post);
    state.loadError = '';
    return data.post;
  }

  async function updatePostStatus(postId, nextStatus, pin) {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, ownerToken: getOwnerToken(postId), pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status.');
    state.posts = state.posts.map((p) => (p.id === postId ? data.post : p));
  }

  async function deletePost(postId, pin) {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerToken: getOwnerToken(postId), pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus postingan.');
    state.posts = state.posts.filter((p) => p.id !== postId);
  }

  // ==================== FILTER & RENDER ====================
  function getFilteredPosts() {
    const query = state.search.trim().toLowerCase();

    const filtered = state.posts.filter((post) => {
      const hasTitle = Boolean(post.judulPkm && post.judulPkm.trim());

      if (state.activeTab === 'open' && post.status !== 'open') return false;
      if (state.activeTab === 'with-idea' && !hasTitle) return false;
      if (state.activeTab === 'no-idea' && hasTitle) return false;

      if (state.prodi && post.prodi !== state.prodi) return false;
      if (state.angkatan && String(post.angkatan) !== String(state.angkatan)) return false;

      if (state.skema === '__NONE__') {
        if (post.skemaPkm) return false;
      } else if (state.skema && post.skemaPkm !== state.skema) {
        return false;
      }

      if (query) {
        const haystack = [
          post.nama,
          post.prodi,
          post.angkatan,
          post.judulPkm,
          post.skemaPkm,
          post.kebutuhan,
          hasTitle ? 'punya judul' : 'belum ada judul',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (state.sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (state.sort === 'open-first') {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return filtered;
  }

  function updateCounts() {
    const total = state.posts.length;
    const open = state.posts.filter((p) => p.status === 'open').length;
    const withIdea = state.posts.filter((p) => Boolean(p.judulPkm && p.judulPkm.trim())).length;
    const withoutIdea = total - withIdea;

    dom.countAll.textContent = total;
    dom.countOpen.textContent = open;
    dom.countWithIdea.textContent = withIdea;
    dom.countWithoutIdea.textContent = withoutIdea;
    dom.pageMeta.textContent = `FTII UHAMKA · ${open} cari tim · ${withoutIdea} belum ada judul`;
  }

  function updateResetVisibility() {
    const dirty =
      state.activeTab !== 'all' ||
      Boolean(state.search.trim()) ||
      Boolean(state.prodi) ||
      Boolean(state.skema) ||
      Boolean(state.angkatan);
    dom.btnResetFilters.classList.toggle('hidden', !dirty);
  }

  function renderCard(post) {
    const hasTitle = Boolean(post.judulPkm && post.judulPkm.trim());
    const isOpen = post.status === 'open';
    const prodiLabel = PRODI_SHORT[post.prodi] || post.prodi;
    const skemaLabel = post.skemaPkm || 'Belum ada skema';
    const waUrl = buildWhatsAppUrl(post);
    const displayPhone = formatDisplayPhone(post.whatsapp);
    const canManage = Boolean(getOwnerToken(post.id)) || Boolean(post.hasPin);

    const roleMeta =
      post.tipe === 'cari-anggota' && post.slotDibutuhkan
        ? `Butuh ${post.slotDibutuhkan} orang`
        : !hasTitle || post.tipe === 'cari-kelompok'
          ? 'Cari kelompok'
          : 'Cari anggota';

    const waSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.49 0 .14 5.35.14 11.92c0 2.1.55 4.15 1.59 5.96L0 24l6.28-1.65a11.87 11.87 0 0 0 5.78 1.48h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.47-8.43zm-8.46 18.33h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.22-3.73.98 1-3.64-.24-.37a9.89 9.89 0 0 1-1.52-5.26c0-5.47 4.45-9.91 9.92-9.91 2.65 0 5.14 1.03 7.01 2.91a9.86 9.86 0 0 1 2.9 7.01c0 5.47-4.45 9.88-9.92 9.88zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/></svg>`;

    return `
      <article class="post-card ${isOpen ? '' : 'is-closed'}">
        <div class="card-meta-top">
          <div class="card-tags">
            <span class="tag ${getTagClass(post.skemaPkm)}">${escapeHtml(skemaLabel)}</span>
            <span class="status-dot ${isOpen ? '' : 'closed'}">${isOpen ? 'Cari tim' : 'Lengkap'}</span>
          </div>
          <span class="post-time">${escapeHtml(formatCompactTime(post.createdAt))}</span>
        </div>

        <h3 class="post-title ${hasTitle ? '' : 'untitled'}">
          ${hasTitle ? escapeHtml(post.judulPkm) : 'Belum ada judul — siap gabung / diskusi'}
        </h3>

        ${post.kebutuhan ? `<p class="post-note">${escapeHtml(post.kebutuhan)}</p>` : ''}

        <div class="card-props">
          <div class="prop-author">${escapeHtml(post.nama)}</div>
          <div class="prop-sub">
            <span>${escapeHtml(prodiLabel)}</span>
            <span class="prop-dot">·</span>
            <span>'${escapeHtml(String(post.angkatan).slice(-2))}</span>
            <span class="prop-dot">·</span>
            <span>${escapeHtml(roleMeta)}</span>
          </div>
        </div>

        <div class="card-actions">
          <a
            href="${waUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="${isOpen ? 'btn-wa' : 'btn-wa-closed'}"
            aria-label="Chat WhatsApp ${escapeHtml(post.nama)}"
          >
            ${waSvg}
            <span>${isOpen ? 'WhatsApp' : 'WhatsApp (Lengkap)'}</span>
          </a>

          <button
            type="button"
            class="icon-btn btn-copy-wa"
            data-phone="${escapeHtml(displayPhone)}"
            title="Salin ${escapeHtml(displayPhone)}"
            aria-label="Salin nomor WhatsApp"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>

          ${
            canManage
              ? `
            <button
              type="button"
              class="icon-btn btn-manage-post"
              data-post-id="${escapeHtml(post.id)}"
              title="Kelola postingan"
              aria-label="Kelola postingan"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
          `
              : ''
          }
        </div>
      </article>
    `;
  }

  function render() {
    updateCounts();
    updateResetVisibility();

    const emptyTitle = dom.emptyState.querySelector('.empty-title');

    if (state.loading) {
      dom.postsGrid.innerHTML = '';
      if (emptyTitle) emptyTitle.textContent = 'Memuat postingan...';
      dom.btnEmptyReset.classList.add('hidden');
      dom.btnEmptyCreate.classList.add('hidden');
      dom.emptyState.classList.remove('hidden');
      return;
    }

    if (state.loadError) {
      dom.postsGrid.innerHTML = '';
      if (emptyTitle) emptyTitle.textContent = state.loadError;
      dom.btnEmptyReset.classList.add('hidden');
      dom.btnEmptyCreate.classList.add('hidden');
      dom.emptyState.classList.remove('hidden');
      return;
    }

    const filtered = getFilteredPosts();
    if (filtered.length === 0) {
      dom.postsGrid.innerHTML = '';
      const hasPosts = state.posts.length > 0;
      if (emptyTitle) {
        emptyTitle.textContent = hasPosts
          ? 'Tidak ada postingan yang cocok'
          : 'Belum ada postingan — jadilah yang pertama!';
      }
      dom.btnEmptyReset.classList.toggle('hidden', !hasPosts);
      dom.btnEmptyCreate.classList.remove('hidden');
      dom.emptyState.classList.remove('hidden');
      return;
    }

    dom.emptyState.classList.add('hidden');
    dom.postsGrid.innerHTML = filtered.map(renderCard).join('');
  }

  // ==================== MODALS ====================
  function openModal(modalEl) {
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    modalEl.classList.add('hidden');
    if (
      dom.postModal.classList.contains('hidden') &&
      dom.guideModal.classList.contains('hidden') &&
      dom.manageModal.classList.contains('hidden')
    ) {
      document.body.style.overflow = '';
    }
  }

  function setFormMode(mode) {
    state.formMode = mode;
    dom.modeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const isNoIdea = mode === 'cari-kelompok';
    dom.pkmFieldsBox.classList.toggle('hidden', isNoIdea);

    if (isNoIdea) {
      dom.inputJudul.value = '';
      dom.inputSkema.value = '';
      dom.inputSlot.value = '';
      dom.labelKebutuhan.innerHTML = 'Keahlian / Minat <span class="muted">(opsional)</span>';
      dom.inputKebutuhan.placeholder = 'Misal: bisa UI/UX Figma, Arduino, atau tulis proposal';
    } else {
      dom.labelKebutuhan.innerHTML = 'Catatan / Keahlian yang Dicari <span class="muted">(opsional)</span>';
      dom.inputKebutuhan.placeholder = 'Misal: butuh anak Elektro (IoT) & STI (UI/proposal)';
    }
  }

  function openPostModal(defaultMode = 'cari-anggota') {
    dom.postForm.reset();
    dom.formError.classList.add('hidden');
    dom.waPreviewHint.classList.add('hidden');
    dom.waPreviewHint.textContent = '';
    setFormMode(defaultMode);
    openModal(dom.postModal);
    setTimeout(() => dom.inputNama.focus(), 50);
  }

  function openManageModal(postId) {
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;

    state.managingPostId = postId;
    const hasLocalToken = Boolean(getOwnerToken(postId));

    dom.managePostOwnerName.textContent = `${post.nama} · ${PRODI_SHORT[post.prodi] || post.prodi} '${String(post.angkatan).slice(-2)}`;
    dom.manageError.classList.add('hidden');
    dom.managePinInput.value = '';
    dom.managePinWrap.classList.toggle('hidden', hasLocalToken);
    dom.btnToggleStatus.textContent =
      post.status === 'open' ? 'Tandai Tim Lengkap' : 'Buka Lagi Pencarian Tim';

    openModal(dom.manageModal);
  }

  function resetAllFilters() {
    state.activeTab = 'all';
    state.search = '';
    state.prodi = '';
    state.skema = '';
    state.angkatan = '';
    state.sort = 'newest';

    dom.searchInput.value = '';
    dom.filterProdi.value = '';
    dom.filterSkema.value = '';
    dom.filterAngkatan.value = '';
    dom.sortSelect.value = 'newest';
    dom.viewTabs.forEach((tab) => {
      const isAll = tab.dataset.tab === 'all';
      tab.classList.toggle('active', isAll);
      tab.setAttribute('aria-selected', String(isAll));
    });

    render();
  }

  // ==================== EVENTS ====================
  dom.btnOpenPostModal.addEventListener('click', () => openPostModal('cari-anggota'));
  dom.btnHeroHasIdea.addEventListener('click', () => openPostModal('cari-anggota'));
  dom.btnHeroNoIdea.addEventListener('click', () => openPostModal('cari-kelompok'));
  dom.btnEmptyCreate.addEventListener('click', () => openPostModal('cari-anggota'));
  dom.btnEmptyReset.addEventListener('click', resetAllFilters);
  dom.btnResetFilters.addEventListener('click', resetAllFilters);
  dom.btnOpenGuide.addEventListener('click', () => openModal(dom.guideModal));

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.closeModal);
      if (target) closeModal(target);
    });
  });

  [dom.postModal, dom.guideModal, dom.manageModal].forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [dom.postModal, dom.guideModal, dom.manageModal].forEach((m) => {
        if (!m.classList.contains('hidden')) closeModal(m);
      });
    }
  });

  dom.modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => setFormMode(btn.dataset.mode));
  });

  dom.inputWhatsapp.addEventListener('input', () => {
    const val = dom.inputWhatsapp.value.trim();
    if (!val) {
      dom.waPreviewHint.classList.add('hidden');
      return;
    }
    const normalized = normalizeWhatsApp(val);
    dom.waPreviewHint.classList.remove('hidden');
    if (normalized) {
      dom.waPreviewHint.textContent = `wa.me/${normalized}`;
      dom.waPreviewHint.className = 'field-hint valid';
    } else {
      dom.waPreviewHint.textContent = 'Format tidak valid (contoh: 081234567890)';
      dom.waPreviewHint.className = 'field-hint invalid';
    }
  });

  dom.postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    dom.formError.classList.add('hidden');

    const nama = dom.inputNama.value.trim();
    const prodi = dom.inputProdi.value;
    const angkatan = dom.inputAngkatan.value;
    const normalizedWa = normalizeWhatsApp(dom.inputWhatsapp.value.trim());
    const judulPkm = state.formMode === 'cari-kelompok' ? '' : dom.inputJudul.value.trim();
    const skemaPkm = state.formMode === 'cari-kelompok' ? '' : dom.inputSkema.value;
    const slotDibutuhkan = state.formMode === 'cari-kelompok' ? '' : dom.inputSlot.value;
    const kebutuhan = dom.inputKebutuhan.value.trim();
    const pin = dom.inputPin.value.trim();

    if (nama.length < 2) {
      dom.formError.textContent = 'Nama wajib diisi.';
      dom.formError.classList.remove('hidden');
      dom.inputNama.focus();
      return;
    }
    if (!normalizedWa) {
      dom.formError.textContent = 'Nomor WhatsApp tidak valid (contoh: 081234567890).';
      dom.formError.classList.remove('hidden');
      dom.inputWhatsapp.focus();
      return;
    }
    if (!prodi) {
      dom.formError.textContent = 'Pilih Program Studi FTII.';
      dom.formError.classList.remove('hidden');
      dom.inputProdi.focus();
      return;
    }
    if (!angkatan) {
      dom.formError.textContent = 'Pilih tahun angkatan.';
      dom.formError.classList.remove('hidden');
      dom.inputAngkatan.focus();
      return;
    }
    if (pin && !/^\d{4,6}$/.test(pin)) {
      dom.formError.textContent = 'PIN harus 4–6 digit angka.';
      dom.formError.classList.remove('hidden');
      dom.inputPin.focus();
      return;
    }

    dom.btnSubmitPost.disabled = true;
    dom.btnSubmitPost.textContent = 'Menyimpan...';

    try {
      await createPost({
        nama,
        prodi,
        angkatan: Number(angkatan),
        whatsapp: normalizedWa,
        judulPkm,
        skemaPkm,
        tipe: state.formMode,
        slotDibutuhkan: slotDibutuhkan ? Number(slotDibutuhkan) : null,
        kebutuhan,
        pin,
      });

      closeModal(dom.postModal);
      resetAllFilters();
      showToast('Postingan ditambahkan');
    } catch (err) {
      dom.formError.textContent = err.message || 'Gagal mengunggah postingan.';
      dom.formError.classList.remove('hidden');
    } finally {
      dom.btnSubmitPost.disabled = false;
      dom.btnSubmitPost.textContent = 'Upload';
    }
  });

  dom.viewTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      state.activeTab = tab.dataset.tab;
      dom.viewTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
      });
      render();
    });
  });

  dom.searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    render();
  });

  dom.filterProdi.addEventListener('change', (e) => {
    state.prodi = e.target.value;
    render();
  });

  dom.filterSkema.addEventListener('change', (e) => {
    state.skema = e.target.value;
    render();
  });

  dom.filterAngkatan.addEventListener('change', (e) => {
    state.angkatan = e.target.value;
    render();
  });

  dom.sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });

  dom.postsGrid.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.btn-copy-wa');
    if (copyBtn) {
      const phone = copyBtn.dataset.phone;
      try {
        await navigator.clipboard.writeText(phone);
        showToast(`Disalin: ${phone}`);
      } catch {
        showToast(phone);
      }
      return;
    }

    const manageBtn = e.target.closest('.btn-manage-post');
    if (manageBtn) {
      openManageModal(manageBtn.dataset.postId);
    }
  });

  dom.btnToggleStatus.addEventListener('click', async () => {
    const post = state.posts.find((p) => p.id === state.managingPostId);
    if (!post) return;
    dom.manageError.classList.add('hidden');
    const nextStatus = post.status === 'open' ? 'closed' : 'open';

    try {
      await updatePostStatus(post.id, nextStatus, dom.managePinInput.value.trim());
      closeModal(dom.manageModal);
      render();
      showToast(nextStatus === 'closed' ? 'Ditandai tim lengkap' : 'Dibuka kembali');
    } catch (err) {
      dom.manageError.textContent = err.message;
      dom.manageError.classList.remove('hidden');
    }
  });

  dom.btnDeletePost.addEventListener('click', async () => {
    const post = state.posts.find((p) => p.id === state.managingPostId);
    if (!post) return;
    if (!window.confirm(`Hapus postingan ${post.nama}?`)) return;
    dom.manageError.classList.add('hidden');

    try {
      await deletePost(post.id, dom.managePinInput.value.trim());
      closeModal(dom.manageModal);
      render();
      showToast('Postingan dihapus');
    } catch (err) {
      dom.manageError.textContent = err.message;
      dom.manageError.classList.remove('hidden');
    }
  });

  fetchPosts();
})();
