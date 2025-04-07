const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getSavePath: () => ipcRenderer.invoke('config:getSavePath'),
  getCopyPath: () => ipcRenderer.invoke('config:getCopyPath'),
  selectSaveFolder: () => ipcRenderer.invoke('dialog:selectSaveFolder'),
  selectCopyFolder: () => ipcRenderer.invoke('dialog:selectCopyFolder'),
  saveFile: (options) => ipcRenderer.invoke('file:save', options),
  deleteFile: (path) => ipcRenderer.invoke('file:delete', path),
  onShowFilePrompt: (callback) => ipcRenderer.on('show-file-prompt', callback),
  setCopyPath: (path) => ipcRenderer.invoke('config:setCopyPath', path)
})
