const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const HttpServer = require('./server/http-server')

// 保持对窗口对象的全局引用
let mainWindow
let httpServer = null

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  })

  // 加载应用的 index.html
  mainWindow.loadFile('index.html')

  // 当窗口准备好显示时再显示，避免视觉闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 当窗口被关闭时发出
  mainWindow.on('closed', () => {
    mainWindow = null
    // 停止HTTP服务器
    if (httpServer) {
      httpServer.stop()
      httpServer = null
    }
  })

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow()

  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // 创建菜单
  createMenu()
})

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，应用程序和它们的菜单栏通常保持活动状态，
  // 直到用户使用 Cmd + Q 明确退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '选择PRD文件夹',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            selectPRDFolder()
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '查看',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '切换开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 PRD Reader',
              message: 'PRD Reader v1.0.0',
              detail: '一个用于浏览PRD文档的Electron应用'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC 处理程序

// 选择PRD文件夹
async function selectPRDFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择PRD文件夹'
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0]
    mainWindow.webContents.send('folder-selected', folderPath)
    return folderPath
  }
  return null
}

ipcMain.handle('select-folder', async () => {
  return await selectPRDFolder()
})

// 启动HTTP服务器
ipcMain.handle('start-server', async (event, folderPath, port = 8000) => {
  try {
    // 停止现有服务器
    if (httpServer) {
      await httpServer.stop()
    }

    // 创建新的HTTP服务器
    httpServer = new HttpServer(folderPath, port)
    await httpServer.start()

    return {
      success: true,
      url: `http://localhost:${port}`,
      port: port
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
})

// 停止HTTP服务器
ipcMain.handle('stop-server', async () => {
  try {
    if (httpServer) {
      await httpServer.stop()
      httpServer = null
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
})

// 获取文件树
ipcMain.handle('get-file-tree', async (event, folderPath) => {
  try {
    const fileUtils = require('./utils/file-utils')
    const tree = await fileUtils.getFileTree(folderPath)
    return { success: true, tree }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
})

// 检查文件是否存在
ipcMain.handle('check-file-exists', async (event, filePath) => {
  try {
    return fs.existsSync(filePath)
  } catch (error) {
    return false
  }
})

// 获取服务器状态
ipcMain.handle('get-server-status', async () => {
  if (httpServer && httpServer.isRunning()) {
    return {
      running: true,
      port: httpServer.getPort(),
      url: httpServer.getUrl()
    }
  }
  return { running: false }
})

// 在应用程序退出前清理资源
app.on('before-quit', () => {
  if (httpServer) {
    httpServer.stop()
  }
}) 