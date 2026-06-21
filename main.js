const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }
    const data = await fs.promises.readFile(filePaths[0], 'utf-8');
    return data;
  });

  ipcMain.handle('dialog:saveFile', async (event, data) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (canceled || !filePath) {
      return false;
    }
    await fs.promises.writeFile(filePath, data, 'utf-8');
    return true;
  });

  ipcMain.handle('dialog:importMarkdown', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }, { name: 'All Files', extensions: ['*'] }]
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }
    const data = await fs.promises.readFile(filePaths[0], 'utf-8');
    return data;
  });

  ipcMain.handle('dialog:exportMarkdown', async (event, data) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }]
    });
    if (canceled || !filePath) {
      return false;
    }
    await fs.promises.writeFile(filePath, data, 'utf-8');
    return true;
  });

  ipcMain.on('app:quit', () => {
    app.quit();
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
