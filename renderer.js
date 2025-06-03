// 渲染进程主脚本
class PRDReader {
  constructor() {
    this.currentFolder = null
    this.serverRunning = false
    this.serverUrl = null
    this.fileTree = null
    this.selectedFile = null
    this.webview = null
    
    this.init()
  }

  init() {
    this.bindEvents()
    this.initWebview()
    this.checkServerStatus()
  }

  // 绑定事件监听器
  bindEvents() {
    // 文件夹选择
    document.getElementById('selectFolderBtn').addEventListener('click', () => {
      this.selectFolder()
    })

    // 服务器控制
    document.getElementById('startServerBtn').addEventListener('click', () => {
      this.startServer()
    })

    document.getElementById('stopServerBtn').addEventListener('click', () => {
      this.stopServer()
    })

    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshFileTree()
    })

    // 浏览器控制
    document.getElementById('backBtn').addEventListener('click', () => {
      this.goBack()
    })

    document.getElementById('forwardBtn').addEventListener('click', () => {
      this.goForward()
    })

    document.getElementById('refreshPageBtn').addEventListener('click', () => {
      this.refreshPage()
    })

    document.getElementById('homeBtn').addEventListener('click', () => {
      this.goHome()
    })

    // 端口输入框回车事件
    document.getElementById('portInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.startServer()
      }
    })

    // 提示框关闭
    document.getElementById('closeErrorToast').addEventListener('click', () => {
      this.hideErrorToast()
    })

    document.getElementById('closeSuccessToast').addEventListener('click', () => {
      this.hideSuccessToast()
    })

    // 监听主进程发送的文件夹选择事件
    window.electronAPI.onFolderSelected((folderPath) => {
      this.handleFolderSelected(folderPath)
    })

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'o':
            e.preventDefault()
            this.selectFolder()
            break
          case 'r':
            e.preventDefault()
            this.refreshFileTree()
            break
        }
      }
    })
  }

  // 初始化WebView
  initWebview() {
    this.webview = document.getElementById('webview')
    
    if (this.webview) {
      // WebView事件监听
      this.webview.addEventListener('dom-ready', () => {
        this.updateBrowserControls()
        this.fixWebviewIframeHeight()
      })

      this.webview.addEventListener('did-start-loading', () => {
        this.showLoading('正在加载页面...')
      })

      this.webview.addEventListener('did-stop-loading', () => {
        this.hideLoading()
        this.updateBrowserControls()
        this.fixWebviewIframeHeight()
      })

      this.webview.addEventListener('did-fail-load', (e) => {
        this.hideLoading()
        this.showError(`页面加载失败: ${e.errorDescription}`)
      })

      this.webview.addEventListener('new-window', (e) => {
        // 在同一个webview中打开新窗口
        this.loadUrl(e.url)
      })

      this.webview.addEventListener('page-title-updated', (e) => {
        document.getElementById('addressInput').value = e.title || this.webview.getURL()
      })
    }
  }

  // 修复WebView内部iframe的高度问题
  fixWebviewIframeHeight() {
    try {
      // 获取webview的Shadow DOM
      const shadowRoot = this.webview.shadowRoot
      if (shadowRoot) {
        // 查找Shadow DOM内部的iframe
        const iframe = shadowRoot.querySelector('iframe')
        if (iframe) {
          // 设置iframe的高度为100%
          iframe.style.height = '100%'
          console.log('WebView iframe height fixed')
        }
      }
    } catch (error) {
      console.warn('无法修复WebView iframe高度:', error.message)
    }
  }

  // 选择文件夹
  async selectFolder() {
    try {
      const folderPath = await window.electronAPI.selectFolder()
      if (folderPath) {
        await this.handleFolderSelected(folderPath)
      }
    } catch (error) {
      this.showError(`选择文件夹失败: ${error.message}`)
    }
  }

  // 处理文件夹选择
  async handleFolderSelected(folderPath) {
    try {
      this.showLoading('正在加载文件列表...')
      
      this.currentFolder = folderPath
      
      // 更新UI
      document.getElementById('folderPath').textContent = folderPath
      document.getElementById('folderInfo').style.display = 'flex'
      document.getElementById('serverConfig').style.display = 'flex'
      
      // 加载文件树
      await this.loadFileTree()
      
      this.hideLoading()
      this.showSuccess('文件夹加载成功')
    } catch (error) {
      this.hideLoading()
      this.showError(`加载文件夹失败: ${error.message}`)
    }
  }

  // 加载文件树
  async loadFileTree() {
    try {
      const result = await window.electronAPI.getFileTree(this.currentFolder)
      
      if (result.success) {
        this.fileTree = result.tree
        this.renderFileTree()
        this.updateFileCount()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      throw new Error(`获取文件树失败: ${error.message}`)
    }
  }

  // 渲染文件树
  renderFileTree() {
    const fileTreeElement = document.getElementById('fileTree')
    const emptyState = document.getElementById('emptyState')
    
    if (!this.fileTree) {
      fileTreeElement.style.display = 'none'
      emptyState.style.display = 'flex'
      return
    }

    emptyState.style.display = 'none'
    fileTreeElement.style.display = 'block'
    fileTreeElement.innerHTML = ''
    
    this.renderTreeNode(this.fileTree, fileTreeElement)
  }

  // 渲染树节点
  renderTreeNode(node, container, level = 0) {
    const nodeElement = document.createElement('div')
    nodeElement.className = 'tree-node'
    
    const itemElement = document.createElement('div')
    itemElement.className = `tree-item ${node.type}`
    
    if (node.isHtml) {
      itemElement.classList.add('html-file')
    }
    
    // 缩进
    itemElement.style.paddingLeft = `${level * 16 + 8}px`
    
    // 展开/折叠按钮
    if (node.type === 'directory' && node.children.length > 0) {
      const toggleElement = document.createElement('span')
      toggleElement.className = 'tree-toggle'
      toggleElement.textContent = '▶'
      toggleElement.addEventListener('click', (e) => {
        e.stopPropagation()
        this.toggleTreeNode(nodeElement, toggleElement)
      })
      itemElement.appendChild(toggleElement)
    } else {
      const spacerElement = document.createElement('span')
      spacerElement.className = 'tree-toggle'
      itemElement.appendChild(spacerElement)
    }
    
    // 图标
    const iconElement = document.createElement('span')
    iconElement.className = 'tree-icon'
    iconElement.textContent = this.getFileIcon(node)
    itemElement.appendChild(iconElement)
    
    // 名称
    const nameElement = document.createElement('span')
    nameElement.className = 'tree-name'
    nameElement.textContent = node.name
    nameElement.title = node.path
    itemElement.appendChild(nameElement)
    
    // 点击事件
    if (node.isHtml) {
      itemElement.addEventListener('click', () => {
        this.selectFile(node, itemElement)
      })
    }
    
    nodeElement.appendChild(itemElement)
    
    // 子节点容器
    if (node.type === 'directory' && node.children.length > 0) {
      const childrenElement = document.createElement('div')
      childrenElement.className = 'tree-children collapsed'
      
      for (const child of node.children) {
        this.renderTreeNode(child, childrenElement, level + 1)
      }
      
      nodeElement.appendChild(childrenElement)
    }
    
    container.appendChild(nodeElement)
  }

  // 获取文件图标
  getFileIcon(node) {
    if (node.type === 'directory') {
      return '📁'
    } else if (node.isHtml) {
      return '🌐'
    } else {
      const ext = node.extension?.toLowerCase()
      switch (ext) {
        case '.js': return '📜'
        case '.css': return '🎨'
        case '.json': return '📋'
        case '.md': return '📝'
        case '.txt': return '📄'
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
        case '.svg': return '🖼️'
        default: return '📄'
      }
    }
  }

  // 切换树节点展开/折叠
  toggleTreeNode(nodeElement, toggleElement) {
    const childrenElement = nodeElement.querySelector('.tree-children')
    if (childrenElement) {
      const isCollapsed = childrenElement.classList.contains('collapsed')
      
      if (isCollapsed) {
        childrenElement.classList.remove('collapsed')
        toggleElement.textContent = '▼'
      } else {
        childrenElement.classList.add('collapsed')
        toggleElement.textContent = '▶'
      }
    }
  }

  // 选择文件
  selectFile(node, itemElement) {
    // 移除之前的选中状态
    const previousSelected = document.querySelector('.tree-item.selected')
    if (previousSelected) {
      previousSelected.classList.remove('selected')
    }
    
    // 添加选中状态
    itemElement.classList.add('selected')
    this.selectedFile = node
    
    // 如果服务器正在运行，加载文件
    if (this.serverRunning && this.serverUrl) {
      const relativePath = this.getRelativePath(node.path)
      const url = `${this.serverUrl}/${relativePath}`
      this.loadUrl(url)
    } else {
      this.showError('请先启动服务器')
    }
  }

  // 获取相对路径
  getRelativePath(filePath) {
    if (!this.currentFolder) return ''
    
    // 使用简单的字符串操作来计算相对路径
    let relativePath = filePath.replace(this.currentFolder, '')
    
    // 移除开头的路径分隔符
    if (relativePath.startsWith('\\') || relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1)
    }
    
    // 统一使用正斜杠
    return relativePath.replace(/\\/g, '/')
  }

  // 启动服务器
  async startServer() {
    if (!this.currentFolder) {
      this.showError('请先选择PRD文件夹')
      return
    }

    try {
      this.showLoading('正在启动服务器...')
      
      const port = parseInt(document.getElementById('portInput').value) || 8000
      const result = await window.electronAPI.startServer(this.currentFolder, port)
      
      if (result.success) {
        this.serverRunning = true
        this.serverUrl = result.url
        
        this.updateServerStatus(true, result.url)
        this.updateServerButtons(true)
        
        // 尝试加载index.html
        await this.loadDefaultPage()
        
        this.hideLoading()
        this.showSuccess(`服务器已启动: ${result.url}`)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      this.hideLoading()
      this.showError(`启动服务器失败: ${error.message}`)
    }
  }

  // 停止服务器
  async stopServer() {
    try {
      this.showLoading('正在停止服务器...')
      
      const result = await window.electronAPI.stopServer()
      
      if (result.success) {
        this.serverRunning = false
        this.serverUrl = null
        
        this.updateServerStatus(false)
        this.updateServerButtons(false)
        this.hideBrowser()
        
        this.hideLoading()
        this.showSuccess('服务器已停止')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      this.hideLoading()
      this.showError(`停止服务器失败: ${error.message}`)
    }
  }

  // 加载默认页面
  async loadDefaultPage() {
    if (!this.serverUrl) return
    
    // 尝试加载index.html
    const indexUrl = `${this.serverUrl}/index.html`
    try {
      const response = await fetch(indexUrl, { method: 'HEAD' })
      if (response.ok) {
        this.loadUrl(indexUrl)
        return
      }
    } catch (error) {
      // 忽略错误，继续尝试其他方式
    }
    
    // 如果没有index.html，加载根目录
    this.loadUrl(this.serverUrl)
  }

  // 加载URL
  loadUrl(url) {
    if (!this.webview) return
    
    try {
      this.webview.src = url
      this.showBrowser()
      document.getElementById('addressInput').value = url
      this.updateBrowserControls()
      
      // 延迟修复iframe高度，确保webview完全加载
      setTimeout(() => {
        this.fixWebviewIframeHeight()
      }, 100)
    } catch (error) {
      this.showError(`加载页面失败: ${error.message}`)
    }
  }

  // 显示浏览器
  showBrowser() {
    document.getElementById('browserEmptyState').style.display = 'none'
    this.webview.style.display = 'block'
    
    // 确保iframe高度正确
    setTimeout(() => {
      this.fixWebviewIframeHeight()
    }, 50)
  }

  // 隐藏浏览器
  hideBrowser() {
    this.webview.style.display = 'none'
    document.getElementById('browserEmptyState').style.display = 'flex'
    document.getElementById('addressInput').value = ''
  }

  // 更新服务器状态
  updateServerStatus(running, url = null) {
    const statusIndicator = document.getElementById('statusIndicator')
    const statusText = document.getElementById('statusText')
    const serverUrl = document.getElementById('serverUrl')
    
    if (running) {
      statusIndicator.className = 'status-indicator running'
      statusText.textContent = '服务器运行中'
      if (url) {
        serverUrl.textContent = url
        serverUrl.style.display = 'inline'
      }
    } else {
      statusIndicator.className = 'status-indicator'
      statusText.textContent = '未连接'
      serverUrl.style.display = 'none'
    }
  }

  // 更新服务器按钮状态
  updateServerButtons(running) {
    const startBtn = document.getElementById('startServerBtn')
    const stopBtn = document.getElementById('stopServerBtn')
    const portInput = document.getElementById('portInput')
    
    if (running) {
      startBtn.style.display = 'none'
      stopBtn.style.display = 'inline-flex'
      portInput.disabled = true
    } else {
      startBtn.style.display = 'inline-flex'
      stopBtn.style.display = 'none'
      portInput.disabled = false
    }
  }

  // 更新浏览器控制按钮
  updateBrowserControls() {
    if (!this.webview) return
    
    const backBtn = document.getElementById('backBtn')
    const forwardBtn = document.getElementById('forwardBtn')
    const homeBtn = document.getElementById('homeBtn')
    
    try {
      backBtn.disabled = !this.webview.canGoBack()
      forwardBtn.disabled = !this.webview.canGoForward()
      homeBtn.disabled = !this.serverRunning
    } catch (error) {
      // WebView可能还没有完全初始化
      backBtn.disabled = true
      forwardBtn.disabled = true
      homeBtn.disabled = true
    }
  }

  // 浏览器导航
  goBack() {
    if (this.webview && this.webview.canGoBack()) {
      this.webview.goBack()
    }
  }

  goForward() {
    if (this.webview && this.webview.canGoForward()) {
      this.webview.goForward()
    }
  }

  refreshPage() {
    if (this.webview) {
      this.webview.reload()
    }
  }

  goHome() {
    if (this.serverUrl) {
      this.loadUrl(this.serverUrl)
    }
  }

  // 刷新文件树
  async refreshFileTree() {
    if (!this.currentFolder) return
    
    try {
      this.showLoading('正在刷新文件列表...')
      await this.loadFileTree()
      this.hideLoading()
      this.showSuccess('文件列表已刷新')
    } catch (error) {
      this.hideLoading()
      this.showError(`刷新失败: ${error.message}`)
    }
  }

  // 更新文件计数
  updateFileCount() {
    if (!this.fileTree) return
    
    const count = this.countHtmlFiles(this.fileTree)
    document.getElementById('fileCount').textContent = `HTML文件: ${count}`
  }

  // 递归计算HTML文件数量
  countHtmlFiles(node) {
    let count = 0
    
    if (node.isHtml) {
      count = 1
    }
    
    if (node.children) {
      for (const child of node.children) {
        count += this.countHtmlFiles(child)
      }
    }
    
    return count
  }

  // 检查服务器状态
  async checkServerStatus() {
    try {
      const status = await window.electronAPI.getServerStatus()
      if (status.running) {
        this.serverRunning = true
        this.serverUrl = status.url
        this.updateServerStatus(true, status.url)
        this.updateServerButtons(true)
      }
    } catch (error) {
      console.warn('检查服务器状态失败:', error)
    }
  }

  // 显示加载状态
  showLoading(text = '正在加载...') {
    document.getElementById('loadingText').textContent = text
    document.getElementById('loadingOverlay').style.display = 'flex'
  }

  // 隐藏加载状态
  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none'
  }

  // 显示错误提示
  showError(message) {
    document.getElementById('errorMessage').textContent = message
    document.getElementById('errorToast').style.display = 'block'
    
    // 3秒后自动隐藏
    setTimeout(() => {
      this.hideErrorToast()
    }, 3000)
  }

  // 隐藏错误提示
  hideErrorToast() {
    document.getElementById('errorToast').style.display = 'none'
  }

  // 显示成功提示
  showSuccess(message) {
    document.getElementById('successMessage').textContent = message
    document.getElementById('successToast').style.display = 'block'
    
    // 2秒后自动隐藏
    setTimeout(() => {
      this.hideSuccessToast()
    }, 2000)
  }

  // 隐藏成功提示
  hideSuccessToast() {
    document.getElementById('successToast').style.display = 'none'
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new PRDReader()
}) 