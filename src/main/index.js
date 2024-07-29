import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import fs from 'fs';
import ytdl from 'ytdl-core';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      img {
        max-width: 100%;
        height: auto;
      }
    `);
  });

  // Modificar CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; img-src 'self' data: https:;"]
      }
    });
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron');
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.handle('fetch-video-info', async (event, url) => {
    try {
      console.log('Fetching video info for URL:', url);
      const info = await ytdl.getInfo(url);
      console.log('Video info retrieved:', info.videoDetails);
      return { title: info.videoDetails.title, thumbnail: info.videoDetails.thumbnails[0].url };
    } catch (error) {
      console.error('Error fetching video info:', error.message);
      throw error;
    }
  });

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result.filePaths[0];
  });

  ipcMain.on('download-video', async (event, { url, outputPath }) => {
    console.log('Received download-video IPC message with URL:', url);
    try {
      const info = await ytdl.getInfo(url);
      const videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
      const output = join(outputPath, `${info.videoDetails.title}.mp4`);

      console.log('Starting video download:', output);
      const videoStream = ytdl(url, { format: videoFormat });
      const fileStream = fs.createWriteStream(output);

      videoStream.pipe(fileStream);

      videoStream.on('progress', (_, downloaded, total) => {
        const progress = (downloaded / total) * 100;
        event.reply('download-progress', progress);
      });

      fileStream.on('finish', () => {
        console.log('Video download complete:', output);
        event.reply('download-complete', output);
      });

      fileStream.on('error', (error) => {
        console.error('Video download error:', error.message);
        event.reply('download-error', error.message);
      });
    } catch (error) {
      console.error('Error getting video info:', error.message);
      event.reply('download-error', error.message);
    }
  });

  ipcMain.on('download-audio', async (event, { url, outputPath }) => {
    console.log('Received download-audio IPC message with URL:', url);
    try {
      const info = await ytdl.getInfo(url);
      const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
      const output = join(outputPath, `${info.videoDetails.title}.mp3`);

      console.log('Starting audio download:', output);
      const audioStream = ytdl(url, { format: audioFormat });
      const fileStream = fs.createWriteStream(output);

      audioStream.pipe(fileStream);

      audioStream.on('progress', (_, downloaded, total) => {
        const progress = (downloaded / total) * 100;
        event.reply('download-progress', progress);
      });

      fileStream.on('finish', () => {
        console.log('Audio download complete:', output);
        event.reply('download-complete', output);
      });

      fileStream.on('error', (error) => {
        console.error('Audio download error:', error.message);
        event.reply('download-error', error.message);
      });
    } catch (error) {
      console.error('Error getting audio info:', error.message);
      event.reply('download-error', error.message);
    }
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
