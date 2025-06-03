const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件夹选择
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // 服务器管理
  startServer: (folderPath, port) => ipcRenderer.invoke('start-server', folderPath, port),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  
  // 文件操作
  getFileTree: (folderPath) => ipcRenderer.invoke('get-file-tree', folderPath),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  
  // 事件监听
  onFolderSelected: (callback) => {
    ipcRenderer.on('folder-selected', (event, folderPath) => callback(folderPath))
  },
  
  // 移除事件监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
}) 