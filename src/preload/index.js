const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  fetchVideoInfo: (url) => ipcRenderer.invoke('fetch-video-info', url),
  downloadVideo: (url, outputPath) => ipcRenderer.send('download-video', { url, outputPath }),
  downloadAudio: (url, outputPath) => ipcRenderer.send('download-audio', { url, outputPath }),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  onDownloadComplete: (callback) => ipcRenderer.on('download-complete', callback),
  onDownloadError: (callback) => ipcRenderer.on('download-error', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback)
});
