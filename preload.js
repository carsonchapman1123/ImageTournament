const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAlbums: () => ipcRenderer.invoke('get-albums'),
  createAlbum: (name) => ipcRenderer.invoke('create-album', name),
  deleteAlbum: (albumId) => ipcRenderer.invoke('delete-album', albumId),
  renameAlbum: (albumId, newName) => ipcRenderer.invoke('rename-album', { albumId, newName }),
  importPhotos: (albumId) => ipcRenderer.invoke('import-photos', albumId),
  getPhotos: (photoIds) => ipcRenderer.invoke('get-photos', photoIds),
  deletePhoto: (photoId, albumId) => ipcRenderer.invoke('delete-photo', { photoId, albumId }),
  addToAlbum: (photoId, targetAlbumId) => ipcRenderer.invoke('add-to-album', { photoId, targetAlbumId }),
});
