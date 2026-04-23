/* ─── State ─── */
let albums = [];
let currentAlbumId = 'all';
let currentPhotos = [];
let lightboxIndex = 0;
let ctxAlbumId = null;
let modalMode = 'create'; // 'create' | 'rename'

/* ─── DOM refs ─── */
const albumsList    = document.getElementById('albumsList');
const photoGrid     = document.getElementById('photoGrid');
const toolbarTitle  = document.getElementById('toolbarTitle');
const importBtn     = document.getElementById('importBtn');
const newAlbumBtn   = document.getElementById('newAlbumBtn');
const newAlbumModal = document.getElementById('newAlbumModal');
const albumNameInput= document.getElementById('albumNameInput');
const modalTitle    = document.getElementById('modalTitle');
const modalCancel   = document.getElementById('modalCancel');
const modalConfirm  = document.getElementById('modalConfirm');
const lightbox      = document.getElementById('lightbox');
const lbImg         = document.getElementById('lb-img');
const lbPrev        = document.getElementById('lbPrev');
const lbNext        = document.getElementById('lbNext');
const lbClose       = document.getElementById('lbClose');
const lbFilename    = document.getElementById('lbFilename');
const lbCounter     = document.getElementById('lbCounter');
const ctxMenu       = document.getElementById('ctxMenu');
const ctxRename     = document.getElementById('ctxRename');
const ctxDelete     = document.getElementById('ctxDelete');

/* ─── Init ─── */
async function init() {
  albums = await window.api.getAlbums();
  renderSidebar();
  selectAlbum('all');
}

/* ─── Sidebar ─── */
function renderSidebar() {
  albumsList.innerHTML = '';
  albums.forEach(album => {
    const item = document.createElement('div');
    item.className = 'album-item' + (album.id === currentAlbumId ? ' active' : '');
    item.dataset.id = album.id;
    item.innerHTML = `
      <span class="album-icon">${album.isDefault ? '🖼' : '📁'}</span>
      <span class="album-name">${escHtml(album.name)}</span>
      <span class="album-count">${album.photos.length}</span>
      ${!album.isDefault ? `<button class="album-ctx-btn" data-id="${album.id}" title="Options">•••</button>` : ''}
    `;

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('album-ctx-btn')) return;
      selectAlbum(album.id);
    });

    const ctxBtn = item.querySelector('.album-ctx-btn');
    if (ctxBtn) {
      ctxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showCtxMenu(e, album.id);
      });
    }

    albumsList.appendChild(item);
  });
}

/* ─── Select Album ─── */
async function selectAlbum(albumId) {
  currentAlbumId = albumId;
  const album = albums.find(a => a.id === albumId);
  if (!album) return;

  // Update sidebar
  document.querySelectorAll('.album-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === albumId);
  });

  // Update title
  if (album.isDefault) {
    toolbarTitle.innerHTML = `All <span>Photos</span>`;
  } else {
    toolbarTitle.textContent = album.name;
  }

  // Load photos
  showGridLoading();
  const photos = await window.api.getPhotos(album.photos);
  currentPhotos = photos;
  renderGrid(photos);
}

/* ─── Grid ─── */
function showGridLoading() {
  photoGrid.innerHTML = `<div class="loading-overlay" style="position:relative;grid-column:1/-1;height:200px;"><div class="spinner"></div></div>`;
}

function renderGrid(photos) {
  photoGrid.innerHTML = '';

  if (photos.length === 0) {
    photoGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📷</div>
        <div class="empty-title">No photos yet</div>
        <div class="empty-sub">Click "Import Photos" to add photos to this album.</div>
      </div>`;
    return;
  }

  photos.forEach((photo, idx) => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.innerHTML = `
      <img src="${photo.filePath}" alt="${escHtml(photo.originalName || photo.id)}" loading="lazy" />
      <div class="photo-overlay">
        <span class="photo-name">${escHtml(photo.originalName || photo.id)}</span>
        <button class="photo-delete-btn" data-idx="${idx}" title="Delete">✕</button>
      </div>
    `;

    // Double-click to open lightbox
    card.addEventListener('dblclick', () => openLightbox(idx));

    // Single click on delete btn
    card.querySelector('.photo-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deletePhoto(photo.id, idx);
    });

    photoGrid.appendChild(card);
  });
}

/* ─── Import Photos ─── */
importBtn.addEventListener('click', async () => {
  const newPhotos = await window.api.importPhotos(currentAlbumId);
  if (newPhotos.length === 0) return;
  albums = await window.api.getAlbums();
  renderSidebar();
  await selectAlbum(currentAlbumId);
});

/* ─── Delete Photo ─── */
async function deletePhoto(photoId, idx) {
  await window.api.deletePhoto(photoId, currentAlbumId);
  albums = await window.api.getAlbums();
  currentPhotos.splice(idx, 1);
  renderSidebar();
  renderGrid(currentPhotos);
}

/* ─── Lightbox ─── */
function openLightbox(idx) {
  lightboxIndex = idx;
  lightbox.classList.add('open');
  updateLightbox();
}

function closeLightbox() {
  lightbox.classList.remove('open');
}

function updateLightbox() {
  const photo = currentPhotos[lightboxIndex];
  if (!photo) return;
  lbImg.style.opacity = '0';
  lbImg.src = photo.filePath;
  lbImg.onload = () => { lbImg.style.opacity = '1'; lbImg.style.transition = 'opacity 0.2s'; };
  lbFilename.textContent = photo.originalName || photo.id;
  lbCounter.textContent = `${lightboxIndex + 1} of ${currentPhotos.length}`;
  lbPrev.disabled = lightboxIndex === 0;
  lbNext.disabled = lightboxIndex === currentPhotos.length - 1;
}

lbPrev.addEventListener('click', () => {
  if (lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
});

lbNext.addEventListener('click', () => {
  if (lightboxIndex < currentPhotos.length - 1) { lightboxIndex++; updateLightbox(); }
});

lbClose.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'ArrowLeft' && lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
  if (e.key === 'ArrowRight' && lightboxIndex < currentPhotos.length - 1) { lightboxIndex++; updateLightbox(); }
  if (e.key === 'Escape') closeLightbox();
});

/* ─── New Album Modal ─── */
newAlbumBtn.addEventListener('click', () => {
  modalMode = 'create';
  modalTitle.textContent = 'New Album';
  albumNameInput.value = '';
  modalConfirm.textContent = 'Create';
  newAlbumModal.classList.add('open');
  setTimeout(() => albumNameInput.focus(), 50);
});

modalCancel.addEventListener('click', () => {
  newAlbumModal.classList.remove('open');
});

newAlbumModal.addEventListener('click', (e) => {
  if (e.target === newAlbumModal) newAlbumModal.classList.remove('open');
});

modalConfirm.addEventListener('click', confirmModal);

albumNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmModal();
  if (e.key === 'Escape') newAlbumModal.classList.remove('open');
});

async function confirmModal() {
  const name = albumNameInput.value.trim();
  if (!name) return;

  if (modalMode === 'create') {
    await window.api.createAlbum(name);
    albums = await window.api.getAlbums();
    renderSidebar();
    // Auto-select new album
    const newAlbum = albums[albums.length - 1];
    selectAlbum(newAlbum.id);
  } else if (modalMode === 'rename' && ctxAlbumId) {
    await window.api.renameAlbum(ctxAlbumId, name);
    albums = await window.api.getAlbums();
    renderSidebar();
    if (currentAlbumId === ctxAlbumId) {
      const album = albums.find(a => a.id === ctxAlbumId);
      if (album) toolbarTitle.textContent = album.name;
    }
  }

  newAlbumModal.classList.remove('open');
}

/* ─── Context Menu ─── */
function showCtxMenu(e, albumId) {
  ctxAlbumId = albumId;
  ctxMenu.classList.add('open');
  let x = e.clientX, y = e.clientY;
  // Ensure menu stays in viewport
  if (x + 170 > window.innerWidth) x = window.innerWidth - 175;
  if (y + 100 > window.innerHeight) y = window.innerHeight - 105;
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top = y + 'px';
}

document.addEventListener('click', () => ctxMenu.classList.remove('open'));

ctxRename.addEventListener('click', () => {
  const album = albums.find(a => a.id === ctxAlbumId);
  if (!album) return;
  modalMode = 'rename';
  modalTitle.textContent = 'Rename Album';
  albumNameInput.value = album.name;
  modalConfirm.textContent = 'Rename';
  newAlbumModal.classList.add('open');
  setTimeout(() => { albumNameInput.focus(); albumNameInput.select(); }, 50);
});

ctxDelete.addEventListener('click', async () => {
  const album = albums.find(a => a.id === ctxAlbumId);
  if (!album) return;

  const confirmDelete = confirm(`Delete album "${album.name}"? Photos only in this album will also be deleted.`);
  if (!confirmDelete) return;

  await window.api.deleteAlbum(ctxAlbumId);
  albums = await window.api.getAlbums();
  renderSidebar();

  if (currentAlbumId === ctxAlbumId) {
    selectAlbum('all');
  }
});

/* ─── Utils ─── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Start ─── */
init();
