const { app, BrowserWindow, ipcMain, dialog, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Data directory for storing albums and photos
const DATA_DIR = path.join(app.getPath('userData'), 'PhotoAlbums');
const ALBUMS_FILE = path.join(DATA_DIR, 'albums.json');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

function loadAlbums() {
  if (!fs.existsSync(ALBUMS_FILE)) {
    const defaultAlbums = [
      { id: 'all', name: 'All Photos', isDefault: true, createdAt: Date.now(), photos: [] }
    ];
    fs.writeFileSync(ALBUMS_FILE, JSON.stringify(defaultAlbums, null, 2));
    return defaultAlbums;
  }
  try {
    return JSON.parse(fs.readFileSync(ALBUMS_FILE, 'utf8'));
  } catch {
    return [{ id: 'all', name: 'All Photos', isDefault: true, createdAt: Date.now(), photos: [] }];
  }
}

function saveAlbums(albums) {
  fs.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2));
}

function createWindow() {
  nativeTheme.themeSource = 'dark';

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // allow loading local file images
    },
    show: false
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
}

// IPC Handlers
ipcMain.handle('get-albums', () => {
  ensureDirectories();
  return loadAlbums();
});

ipcMain.handle('create-album', (_, name) => {
  const albums = loadAlbums();
  const newAlbum = {
    id: `album_${Date.now()}`,
    name,
    isDefault: false,
    createdAt: Date.now(),
    photos: []
  };
  albums.push(newAlbum);
  saveAlbums(albums);
  return newAlbum;
});

ipcMain.handle('delete-album', (_, albumId) => {
  let albums = loadAlbums();
  const album = albums.find(a => a.id === albumId);
  if (!album || album.isDefault) return { success: false, error: 'Cannot delete default album' };

  // Remove photos that only exist in this album
  const allAlbum = albums.find(a => a.id === 'all');
  album.photos.forEach(photoId => {
    const inOtherAlbums = albums.some(a => a.id !== albumId && a.id !== 'all' && a.photos.includes(photoId));
    if (!inOtherAlbums) {
      // Remove from All Photos too
      if (allAlbum) allAlbum.photos = allAlbum.photos.filter(p => p !== photoId);
      // Delete the actual file
      const photoFilePath = path.join(PHOTOS_DIR, photoId);
      if (fs.existsSync(photoFilePath)) fs.unlinkSync(photoFilePath);
    }
  });

  albums = albums.filter(a => a.id !== albumId);
  saveAlbums(albums);
  return { success: true };
});

ipcMain.handle('rename-album', (_, { albumId, newName }) => {
  const albums = loadAlbums();
  const album = albums.find(a => a.id === albumId);
  if (!album || album.isDefault) return { success: false };
  album.name = newName;
  saveAlbums(albums);
  return { success: true };
});

ipcMain.handle('import-photos', async (_, albumId) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic'] }]
  });

  if (result.canceled || !result.filePaths.length) return [];

  const albums = loadAlbums();
  const targetAlbum = albums.find(a => a.id === albumId);
  const allAlbum = albums.find(a => a.id === 'all');
  if (!targetAlbum) return [];

  const importedPhotos = [];

  for (const srcPath of result.filePaths) {
    const ext = path.extname(srcPath).toLowerCase();
    const photoId = path.basename(srcPath);
    const destPath = path.join(PHOTOS_DIR, photoId);

    fs.copyFileSync(srcPath, destPath);

    const stat = fs.statSync(destPath);
    const photo = {
      id: photoId,
      originalName: path.basename(srcPath),
      filePath: destPath,
      size: stat.size,
    };

    if (!importedPhotos.includes(photo)) importedPhotos.push(photo);

    if (!targetAlbum.photos.includes(photoId)) targetAlbum.photos.push(photoId);
    if (albumId !== 'all' && !allAlbum.photos.includes(photoId)) allAlbum.photos.push(photoId);
  }

  saveAlbums(albums);
  return importedPhotos;
});

ipcMain.handle('get-photos', (_, photoIds) => {
  ensureDirectories();
  const photos = [];
  for (const id of photoIds) {
    const filePath = path.join(PHOTOS_DIR, id);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      photos.push({ id, filePath: `file://${filePath}`, size: stat.size, addedAt: stat.birthtimeMs });
    }
  }
  return photos;
});

ipcMain.handle('delete-photo', (_, { photoId, albumId }) => {
  const albums = loadAlbums();
  const allAlbum = albums.find(a => a.id === 'all');

  if (albumId === 'all') {
    // Remove from all albums and delete file
    albums.forEach(album => {
      album.photos = album.photos.filter(p => p !== photoId);
    });
    const filePath = path.join(PHOTOS_DIR, photoId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } else {
    // Remove from this album only
    const album = albums.find(a => a.id === albumId);
    if (album) album.photos = album.photos.filter(p => p !== photoId);
    // Check if still in other albums
    const inOtherAlbums = albums.some(a => a.id !== albumId && a.id !== 'all' && a.photos.includes(photoId));
    if (!inOtherAlbums) {
      if (allAlbum) allAlbum.photos = allAlbum.photos.filter(p => p !== photoId);
      const filePath = path.join(PHOTOS_DIR, photoId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  saveAlbums(albums);
  return { success: true };
});

ipcMain.handle('add-to-album', (_, { photoId, targetAlbumId }) => {
  const albums = loadAlbums();
  const targetAlbum = albums.find(a => a.id === targetAlbumId);
  if (targetAlbum && !targetAlbum.photos.includes(photoId)) {
    targetAlbum.photos.push(photoId);
    saveAlbums(albums);
  }
  return { success: true };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
