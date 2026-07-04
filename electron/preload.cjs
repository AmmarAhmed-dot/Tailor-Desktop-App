const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readData: () => ipcRenderer.invoke('read-data'),
  writeData: (data) => ipcRenderer.invoke('write-data', data),
  exportData: (data) => ipcRenderer.invoke('export-data', data),
  importData: () => ipcRenderer.invoke('import-data'),
  checkAutoBackup: () => ipcRenderer.invoke('check-auto-backup'),
  forceAutoBackup: () => ipcRenderer.invoke('force-auto-backup'),
});
